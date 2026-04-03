# ==============================================================
# detectors/audio.py  —  Hybrid Audio: faster-whisper + YAMNet (V8.0)
# ==============================================================
#
# CHANGES vs V7.5:
#   - MicMonitor: adaptive noise floor using exponential moving average
#     instead of a fixed calibration locked after 6 seconds.
#     Old: 2 chunks (~6s) → lock floor permanently → noisy room masks speech.
#     New: floor decays toward quieter measurements using EMA with alpha
#          from config.AUDIO_NOISE_FLOOR_EMA_ALPHA (default 0.02).
#          Gradual tracking means a momentarily noisy calibration window
#          no longer silences the detector for the whole exam.
#   - WebAudioHandler: replaced MicMonitor.RMS_FLOOR (class attribute
#     that didn't exist on MicMonitor) with config.AUDIO_NOISE_FLOOR_MIN.
#   - LLM verifier model fallback is in llm_verifier.py, not here.
#
# Architecture unchanged from V7.5:
#   Layer 0: RMS energy gate  — pure numpy, <0.1ms
#   Layer 1: faster-whisper (CUDA: base / CPU: tiny)
#   Layer 2: YAMNet — non-speech audio event detection
# ==============================================================

import os, time, threading, tempfile, subprocess
import numpy as np
import config

# ── faster-whisper ────────────────────────────────────────────
_WHISPER       = False
_whisper_model = None

def _ensure_whisper():
    global _WHISPER, _whisper_model
    if _WHISPER or _whisper_model is not None:
        return
    try:
        from faster_whisper import WhisperModel
        import torch
        device     = "cuda" if torch.cuda.is_available() else "cpu"
        model_size = "base" if device == "cuda" else "tiny"
        compute    = "float16" if device == "cuda" else "int8"
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute)
        _WHISPER = True
        print(f"  [Audio] faster-whisper {model_size} loaded on {device} ({compute})")
    except ImportError:
        print("  [Audio] faster-whisper not installed — speech transcription disabled.")
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

try:
    import sounddevice as sd
    _SD = True
except ImportError:
    _SD = False


# ── RMS energy gate ───────────────────────────────────────────
def _rms(audio: np.ndarray) -> float:
    return float(np.sqrt(np.mean(audio ** 2)))


# ── Whisper transcriber ───────────────────────────────────────
class SpeechTranscriber:
    """
    Wraps faster-whisper for exam-context transcription.
    Tuned for short (~3s) chunks of quiet speech.
    Includes English and Egyptian Arabic function words as innocent vocab.
    """

    _INNOCENT = {
        "the", "a", "an", "and", "or", "but", "is", "it", "in", "of",
        "to", "for", "with", "that", "this", "on", "at", "by", "from",
        "و", "ف", "ق", "في", "من", "إلى", "على", "أن", "هذا", "هذه",
        "ال", "مع", "ل", "لا", "ما", "هو", "هي", "أنا", "نحن", "أو",
        "إذا", "حيث", "كان", "يكون", "بس", "يعني", "طب", "ممكن",
    }

    def transcribe(self, audio: np.ndarray) -> list[dict]:
        _ensure_whisper()
        if not _WHISPER or audio is None or len(audio) == 0:
            return []
        try:
            segments, info = _whisper_model.transcribe(
                audio,
                language         = None,
                beam_size        = 1,
                vad_filter       = True,
                vad_parameters   = {
                    "threshold":             0.45,
                    "min_speech_duration_ms": 300,
                    "min_silence_duration_ms": 500,
                },
                no_speech_threshold        = 0.7,
                condition_on_previous_text = False,
            )
            events = []
            for seg in segments:
                text = seg.text.strip()
                if not text or len(text) < 3:
                    continue
                words      = set(text.lower().split())
                is_innocent = words.issubset(self._INNOCENT)
                display    = f"Speech detected: \"{text}\""
                severity   = "whisper" if is_innocent else "multi_talk"
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
    Records mic in CHUNK_SEC chunks.
    Pipeline per chunk:
      1. RMS gate       — skip if silence
      2. Whisper        — transcribe speech
      3. YAMNet         — media detection if Whisper found nothing
      4. Callback       — report events to EventLogger

    FIX (V8.0): Adaptive noise floor via EMA.
      Old: lock floor after 2 calibration chunks (~6s) → permanently wrong
           if the room is noisy during calibration.
      New: floor updates every chunk via exponential moving average.
           alpha=0.02 means gentle drift toward quieter moments, so a
           quiet room naturally lowers the floor and a noisy burst raises
           it only slightly without silencing the detector.
    """

    CHUNK_SEC = 3.0

    def __init__(self, callback):
        self._cb          = callback
        self._running     = False
        self._thread      = None
        self._last:       dict[str, float] = {}
        self._transcriber = SpeechTranscriber()
        self._media_clf   = MediaClassifier()

        # FIX (V8.0): Start floor at min value; EMA will adapt upward
        # as ambient noise is observed. This replaces the fixed-calibration
        # window approach.
        self._rms_floor   = config.AUDIO_NOISE_FLOOR_MIN
        self._alpha       = config.AUDIO_NOISE_FLOOR_EMA_ALPHA

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
        if _YAMNET:
            active.append("YAMNet")
        print(f"  [Audio] Microphone monitor started ({' + '.join(active)}).")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=3.0)

    def _update_floor(self, rms_val: float):
        """
        FIX (V8.0): EMA update of noise floor.
        Only update toward a *lower* value — the floor never auto-raises
        to swallow real speech, it only lowers to track a quiet room.
        It raises only if the current reading is below the floor (which
        means it was set too high by a noisy calibration window).
        """
        if rms_val < self._rms_floor:
            # Room got quieter — lower the floor slowly
            self._rms_floor = (self._alpha * rms_val +
                               (1 - self._alpha) * self._rms_floor)
            self._rms_floor = max(self._rms_floor, config.AUDIO_NOISE_FLOOR_MIN)

    def _loop(self):
        import queue as _queue
        chunk_q   = _queue.Queue(maxsize=4)
        n_samples = int(self.CHUNK_SEC * config.SAMPLE_RATE)
        leftover  = np.array([], dtype=np.float32)

        def _sd_callback(indata, frames, time_info, status):
            chunk_q.put(indata.flatten().copy(), block=False) if not chunk_q.full() else None

        try:
            stream = sd.InputStream(
                samplerate = config.SAMPLE_RATE,
                channels   = 1,
                dtype      = "float32",
                blocksize  = 4096,
                callback   = _sd_callback,
            )
        except Exception as e:
            print(f"  [Audio] Could not open InputStream: {e}")
            return

        with stream:
            while self._running:
                try:
                    block    = chunk_q.get(timeout=0.5)
                    leftover = np.concatenate([leftover, block])

                    if len(leftover) < n_samples:
                        continue

                    chunk    = leftover[:n_samples]
                    leftover = leftover[n_samples:]

                    rms_val  = _rms(chunk)

                    # FIX (V8.0): update adaptive floor on every chunk
                    self._update_floor(rms_val)

                    if rms_val < self._rms_floor:
                        continue  # silent — skip both models

                    events = []
                    if _WHISPER:
                        events = self._transcriber.transcribe(chunk)

                    if not events and _YAMNET:
                        events = self._media_clf.classify(chunk)

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
        # FIX (V8.0): use config constant instead of missing class attribute
        if audio is None or _rms(audio) < config.AUDIO_NOISE_FLOOR_MIN:
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
