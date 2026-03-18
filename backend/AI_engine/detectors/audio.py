# ==============================================================
# detectors/audio.py  —  Hybrid Audio: faster-whisper + YAMNet
# ==============================================================
#
# Architecture:
#   Layer 0: RMS energy gate  — pure numpy, <0.1ms
#             if room is silent → skip everything
#   Layer 1: faster-whisper (CUDA: base / CPU: tiny)
#             captures WHAT is said, runs every 3s on 3s chunks
#             built-in Silero VAD filters silence within the chunk
#             GPU: "base" model — much better accuracy for accents,
#             whispers, Arabic; only ~2x slower than "tiny" but audio
#             runs on its own thread so the video loop never notices.
#             CPU fallback: "tiny" to keep CPU usage manageable.
#   Layer 2: YAMNet  — non-speech audio event detection
#             catches music, TV, media playing nearby
#             only runs when energy gate passes + no speech found
#
# Why this is better than YAMNet-only:
#   - Actual words logged in PDF report ("student said: 'what is Q3'")
#   - Near-zero false positives: silence gate + Silero VAD double filter
#   - YAMNet still catches media/music that Whisper ignores
#   - All inference is async — main loop never blocked
#
# Install:  pip install faster-whisper
#           (CUDA support comes automatically if PyTorch CUDA is installed)
# ==============================================================

import os, time, threading, tempfile, subprocess
import numpy as np
import config

# ── faster-whisper ────────────────────────────────────────────
_WHISPER    = False
_whisper_model = None

def _ensure_whisper():
    global _WHISPER, _whisper_model
    if _WHISPER or _whisper_model is not None:
        return
    try:
        from faster_whisper import WhisperModel
        import torch
        device  = "cuda" if torch.cuda.is_available() else "cpu"
        # IMPROVEMENT: Use "base" on GPU — 2x slower than "tiny" but dramatically
        # better accuracy for whispers, accents, and Arabic. Since the audio
        # pipeline runs on its own thread, the video loop is completely unaffected.
        # On CPU, keep "tiny" to avoid making CPU-only machines unusable.
        model_size = "base" if device == "cuda" else "tiny"
        compute    = "float16" if device == "cuda" else "int8"
        _whisper_model = WhisperModel(
            model_size,
            device       = device,
            compute_type = compute,
        )
        _WHISPER = True
        print(f"  [Audio] faster-whisper {model_size} loaded on {device} ({compute})")
    except ImportError:
        print("  [Audio] faster-whisper not installed — run: pip install faster-whisper")
        print("           Speech transcription disabled; YAMNet only.")
    except Exception as e:
        print(f"  [Audio] faster-whisper failed to load: {e}")


# ── YAMNet ────────────────────────────────────────────────────
_YAMNET    = False
_yamnet    = None
_class_map: list[str] = []

def _ensure_yamnet():
    global _YAMNET, _yamnet, _class_map
    if _YAMNET or _yamnet is not None:
        return
    try:
        import tensorflow_hub as hub, shutil
        def _try():
            return hub.load("https://tfhub.dev/google/yamnet/1")
        try:
            _yamnet = _try()
        except Exception as ex1:
            cache = os.environ.get("TFHUB_CACHE_DIR",
                    os.path.join(tempfile.gettempdir(), "tfhub_modules"))
            try:
                shutil.rmtree(cache)
                print("  [Audio] Cleared TFHub cache, retrying…")
                _yamnet = _try()
            except Exception:
                local = os.path.join(os.path.dirname(__file__), "yamnet")
                if os.path.isdir(local):
                    _yamnet = hub.load(local)
                else:
                    raise ex1
        _class_map = open(_yamnet.class_map_path().numpy()).read().splitlines()
        _YAMNET = True
        print("  [Audio] YAMNet loaded.")
    except Exception as e:
        print(f"  [Audio] YAMNet not available: {e}")

# ── sounddevice ──────────────────────────────────────────────
try:
    import sounddevice as sd
    _SD = True
except ImportError:
    _SD = False


# ── RMS energy gate ───────────────────────────────────────────
def _rms(audio: np.ndarray) -> float:
    """Root-mean-square energy. <0.1ms. Used to skip silent chunks."""
    return float(np.sqrt(np.mean(audio ** 2)))


# ── Whisper transcriber ───────────────────────────────────────
class SpeechTranscriber:
    """
    Wraps faster-whisper for exam-context transcription.
    Tuned for short (~3s) chunks of quiet speech.

    vad_filter=True uses Silero VAD internally to skip non-speech
    regions within the chunk — this is the second noise gate after
    the RMS energy gate, and catches breath sounds / paper rustling
    that pass the energy gate but aren't speech.
    """
    # Words that indicate innocent activity (reading aloud to oneself)
    # vs. suspicious communication — logged but lower severity
    _INNOCENT = {"the","a","an","and","or","but","is","it","in","of",
                 "to","for","with","that","this","on","at","by","from"}

    def transcribe(self, audio: np.ndarray) -> list[dict]:
        """
        Returns list of event dicts, one per detected speech segment.
        Each dict has: event, display, confidence, transcript
        """
        _ensure_whisper()
        if not _WHISPER or audio is None or len(audio) == 0:
            return []
        try:
            segments, info = _whisper_model.transcribe(
                audio,
                language         = None,    # auto-detect — handles multiple languages
                beam_size        = 1,       # fastest; sufficient for short chunks
                vad_filter       = True,    # Silero VAD — second noise gate
                vad_parameters   = {
                    "threshold":             0.45,   # speech confidence required
                    "min_speech_duration_ms": 300,   # ignore <300ms puffs
                    "min_silence_duration_ms": 500,
                },
                no_speech_threshold = 0.7,  # if Whisper itself thinks no speech → skip
                condition_on_previous_text = False,  # stateless per chunk
            )

            events = []
            for seg in segments:
                text = seg.text.strip()
                if not text or len(text) < 3:
                    continue

                words = set(text.lower().split())
                is_innocent = words.issubset(self._INNOCENT)
                display     = f"Speech detected: \"{text}\""
                severity    = "whisper" if is_innocent else "multi_talk"

                events.append({
                    "event":      severity,
                    "display":    display,
                    "confidence": float(getattr(seg, "avg_logprob", -0.5)),
                    "transcript": text,
                })
            return events

        except Exception as e:
            print(f"  [Audio] Whisper error: {e}")
            return []


# ── YAMNet non-speech classifier ─────────────────────────────
class MediaClassifier:
    """
    Checks top-5 YAMNet predictions for non-speech audio events.
    Only called when Whisper finds no speech — so it catches:
    music, TV audio, other media playing in the room.
    """
    def classify(self, audio: np.ndarray) -> list[dict]:
        _ensure_yamnet()
        if not _YAMNET or audio is None or len(audio) == 0:
            return []
        try:
            scores, _, _ = _yamnet(audio)
            sc     = scores.numpy().mean(axis=0)
            top5   = sc.argsort()[-5:][::-1]
            events = []
            seen   = set()

            for idx in top5:
                label = _class_map[idx] if _class_map else str(idx)
                conf  = float(sc[idx])

                # Only non-speech media labels — speech is handled by Whisper
                if label in config.MEDIA_LABELS and conf > config.MEDIA_THR:
                    if "media" not in seen:
                        events.append({
                            "event":      "media",
                            "display":    f"Media audio detected ({label})",
                            "confidence": conf,
                            "transcript": "",
                        })
                        seen.add("media")

            return events
        except Exception as e:
            print(f"  [Audio] YAMNet error: {e}")
            return []


# ── Desktop Microphone Monitor ────────────────────────────────
class MicMonitor:
    """
    Records mic in WHISPER_CHUNK_SEC chunks.
    Pipeline per chunk:
      1. RMS gate  — skip if silence
      2. Whisper   — transcribe speech → event if found
      3. YAMNet    — media detection if Whisper found nothing
      4. Callback  — report events to EventLogger

    Everything runs in a background thread — main loop never waits.
    """
    CHUNK_SEC = 3.0   # Whisper works best with 3-30s chunks
    MIN_RMS_FLOOR = 0.005 # Absolute minimum silence gate

    def __init__(self, callback):
        self._cb          = callback
        self._running     = False
        self._thread      = None
        self._last:       dict[str, float] = {}
        self._transcriber = SpeechTranscriber()
        self._media_clf   = MediaClassifier()
        self._rms_floor   = self.MIN_RMS_FLOOR
        self._calibrating = True
        self._calib_samples = []

    def start(self):
        _ensure_whisper()
        _ensure_yamnet()
        if not _SD:
            print("  [Audio] sounddevice not installed — mic monitor disabled.")
            return
        if not _WHISPER and not _YAMNET:
            print("  [Audio] Neither Whisper nor YAMNet available — mic monitor disabled.")
            return
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        active = []
        if _WHISPER:
            import torch
            _wsize = "base" if torch.cuda.is_available() else "tiny"
            active.append(f"Whisper-{_wsize}")
        if _YAMNET:  active.append("YAMNet")
        print(f"  [Audio] Microphone monitor started ({' + '.join(active)}).")

    def stop(self):
        self._running = False
        if self._thread: self._thread.join(timeout=3.0)

    def _loop(self):
        # FIX: The original implementation used sd.rec() + sd.wait() which
        # BLOCKS the audio thread for the full CHUNK_SEC (3 seconds) while
        # recording. Although the audio thread is separate from the video
        # main loop, sd.wait() also pauses the sounddevice internal scheduler,
        # which caused CPU contention that dropped the main loop from 30→3 FPS.
        #
        # Fix: Use sd.InputStream with a callback queue instead of sd.wait().
        # Recording happens in sounddevice's internal C thread; chunks are
        # pushed into a Queue and consumed here — zero blocking in Python.
        import queue as _queue
        chunk_q    = _queue.Queue(maxsize=4)
        n_samples  = int(self.CHUNK_SEC * config.SAMPLE_RATE)
        leftover   = np.array([], dtype=np.float32)

        def _sd_callback(indata, frames, time_info, status):
            # This runs in sounddevice's C thread — must be non-blocking
            chunk_q.put(indata.flatten().copy(), block=False) if not chunk_q.full() else None

        try:
            stream = sd.InputStream(
                samplerate = config.SAMPLE_RATE,
                channels   = 1,
                dtype      = "float32",
                blocksize  = 4096,          # ~256ms per callback — low latency
                callback   = _sd_callback,
            )
        except Exception as e:
            print(f"  [Audio] Could not open InputStream: {e}")
            return

        with stream:
            while self._running:
                try:
                    # Accumulate raw blocks until we have a full CHUNK_SEC chunk
                    block = chunk_q.get(timeout=0.5)
                    leftover = np.concatenate([leftover, block])

                    if len(leftover) < n_samples:
                        continue          # not enough data yet — keep accumulating

                    chunk    = leftover[:n_samples]
                    leftover = leftover[n_samples:]

                    # ── Layer 0: RMS energy gate ──────────────
                    rms_val = _rms(chunk)
                    
                    if self._calibrating:
                        self._calib_samples.append(rms_val)
                        if len(self._calib_samples) >= 2: # ~6 seconds of audio
                            self._rms_floor = max(self.MIN_RMS_FLOOR, np.mean(self._calib_samples) + 0.002)
                            self._calibrating = False
                            print(f"  [Audio] Dynamic noise floor calibrated to {self._rms_floor:.4f}")
                        
                    if rms_val < self._rms_floor:
                        continue          # silent — skip both models

                    # ── Layer 1: Whisper (speech) ─────────────
                    events = []
                    if _WHISPER:
                        events = self._transcriber.transcribe(chunk)

                    # ── Layer 2: YAMNet (media) ───────────────
                    # Only run if Whisper found nothing — saves time
                    # and avoids double-flagging the same audio
                    if not events and _YAMNET:
                        events = self._media_clf.classify(chunk)

                    # ── Dispatch with cooldown ────────────────
                    now = time.time()
                    for ev in events:
                        key = ev["event"]
                        if now - self._last.get(key, 0) >= config.AUDIO_COOLDOWN:
                            self._last[key] = now
                            self._cb(ev["display"], ev.get("confidence", 0.5),
                                     ev.get("transcript", ""))

                except _queue.Empty:
                    continue
                except Exception as e:
                    print(f"  [Audio] Mic loop error: {e}")
                    time.sleep(0.5)


# ── Web / API Audio Handler ───────────────────────────────────
class WebAudioHandler:
    """For browser-based deployments — receives audio blobs via HTTP."""
    def __init__(self):
        _ensure_whisper()
        _ensure_yamnet()
        self._transcriber = SpeechTranscriber()
        self._media_clf   = MediaClassifier()
        self._last: dict[str, float] = {}

    def process_blob(self, audio_bytes: bytes, mime: str) -> list[dict]:
        audio = AudioNormalizer.from_bytes(audio_bytes, mime)
        if audio is None or _rms(audio) < MicMonitor.RMS_FLOOR:
            return []

        events = self._transcriber.transcribe(audio)
        if not events:
            events = self._media_clf.classify(audio)

        now, result = time.time(), []
        for ev in events:
            key = ev["event"]
            if now - self._last.get(key, 0) >= config.AUDIO_COOLDOWN:
                self._last[key] = now
                result.append(ev)
        return result


# ── Audio Normalizer (for web blob mode) ─────────────────────
class AudioNormalizer:
    @staticmethod
    def from_bytes(audio_bytes: bytes, mime: str = "audio/webm") -> "np.ndarray | None":
        ext = AudioNormalizer._ext(mime)
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(audio_bytes)
            in_path = f.name
        out_path = in_path + ".wav"
        try:
            cmd = ["ffmpeg", "-y", "-i", in_path,
                   "-ar", str(config.SAMPLE_RATE),
                   "-ac", "1", "-f", "wav", "-loglevel", "quiet", out_path]
            r = subprocess.run(cmd, capture_output=True, timeout=10)
            if r.returncode != 0:
                return AudioNormalizer._pydub(in_path)
            import wave
            with wave.open(out_path, "rb") as wf:
                raw = wf.readframes(wf.getnframes())
            return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        except FileNotFoundError:
            return AudioNormalizer._pydub(in_path)
        except Exception as e:
            print(f"  [Audio] Normalize error: {e}"); return None
        finally:
            for p in [in_path, out_path]:
                try: os.unlink(p)
                except: pass

    @staticmethod
    def _pydub(path):
        try:
            from pydub import AudioSegment
            a = AudioSegment.from_file(path).set_frame_rate(
                config.SAMPLE_RATE).set_channels(1)
            return np.array(a.get_array_of_samples(), dtype=np.float32) / 32768.0
        except Exception as e:
            print(f"  [Audio] pydub fallback failed: {e}"); return None

    @staticmethod
    def _ext(mime):
        m = mime.lower().split(";")[0].strip()
        return {"audio/webm":".webm","audio/ogg":".ogg","audio/mp4":".mp4",
                "audio/x-m4a":".m4a","audio/mpeg":".mp3","audio/wav":".wav",
                "audio/x-wav":".wav","audio/flac":".flac"}.get(m, ".webm")
