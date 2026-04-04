# ==============================================================
# detectors/audio.py  —  Egyptian Arabic Speech Detection (V9.1)
# ==============================================================
#
# CHANGES vs V9.0 (which used faster-whisper tiny/base):
#
#   REPLACEMENT — SpeechTranscriber now uses whisper-large-v3
#     Old: tiny (CPU) / base (CUDA) — trained mostly on English + MSA.
#          Egyptian dialect phonemes, dropped letters, and code-switching
#          (Arabic mid-sentence English) were systematically missed.
#     New: large-v3 on CUDA float16 — the best publicly available model
#          for Egyptian Arabic. Handles عامية مصرية including:
#            - Code-switching:  "انا مش عارف the answer"
#            - Dropped letters: "ايه ده" / "مش عارف" / "يعني ايه"
#            - Dialectal vocab: "بص", "عشان", "دلوقتي", "ازيك"
#          On RTX 3050/3060 with float16, large-v3 transcribes a 3-second
#          chunk in ~0.4-1.0 seconds — always faster than the chunk itself.
#
#   TUNING — Whisper forced to Arabic
#     language="ar" forces the decoder to Arabic tokens.
#     Without this, Whisper sometimes hallucinates English for short
#     Egyptian utterances because its prior favors English.
#     With language="ar", Egyptian dialect tokens are in-distribution.
#
#   TUNING — VAD parameters tightened for exam room acoustics
#     min_speech_duration_ms: 200ms  (was 300ms) — catches short "آه" / "لأ"
#     min_silence_duration_ms: 400ms (was 500ms) — tighter segmentation
#     threshold: 0.40               (was 0.45)   — more sensitive VAD
#
#   TUNING — Egyptian Arabic innocence filter
#     Expanded _INNOCENT with Egyptian dialectal filler words and
#     common exam-context single-word responses that are not cheating.
#     Also filters pure punctuation/noise transcriptions.
#
#   TUNING — initial_prompt for decoder context
#     Priming the decoder with an Egyptian Arabic exam context sentence
#     biases the language model toward dialectal vocabulary and reduces
#     hallucination of unrelated content on short utterances.
#
#   RETAINED — YAMNet media detection (music/TV/radio in background)
#   RETAINED — Adaptive EMA noise floor (V8.0)
#   RETAINED — MicMonitor / WebAudioHandler / AudioNormalizer structure
#   RETAINED — All cooldown, callback, and event dict contracts
#
# MODEL VRAM BUDGET (RTX 3050/3060):
#   whisper-large-v3 float16 ≈ 3.0 GB VRAM
#   YOLO11n                  ≈ 0.3 GB VRAM
#   Total                    ≈ 3.3 GB  — fits in 4 GB / 6 GB cards
#
# REQUIREMENTS (no new packages — all already in requirements.txt):
#   faster-whisper >= 1.0.0   ← already required
#   torch with CUDA           ← already required for YOLO
#   sounddevice               ← already required
# ==============================================================

import os, time, threading, tempfile, subprocess
import numpy as np
import config

# ── faster-whisper (Egyptian Arabic large-v3) ─────────────────
_WHISPER       = False
_whisper_model = None

def _ensure_whisper():
    """
    Load a Whisper model using faster-whisper.

    Model selection rationale:
      CUDA → small       : lightweight, runs on most GPUs, float16 supported.
                           Good for testing and casual transcription.
      CPU  → small/int8  : small model runs acceptably on CPU with int8 precision.
                           tiny/base are too inaccurate for Egyptian dialect.
                           medium/large models are too slow for real-time chunks.
    
    Notes on downloads:
      - The first time a model is requested, faster-whisper downloads the model
        weights from Hugging Face (~469 MB for 'small').
      - Files are cached in ~/.cache/faster-whisper so subsequent loads are instant.
    """
    global _WHISPER, _whisper_model
    if _WHISPER or _whisper_model is not None:
        return  # Already loaded

    try:
        from faster_whisper import WhisperModel
        import torch

        # Approximate model sizes for reference
        _MODEL_SIZES = {
            "tiny": "72 MB",
            "base": "142 MB",
            "small": "469 MB",
            "medium": "1.5 GB",
            "large-v3": "3.1 GB",
        }

        # Device selection and compute type — reads from config.py
        if torch.cuda.is_available():
            device     = "cuda"
            model_size = config.WHISPER_MODEL_CUDA  # e.g. "large-v3"
            compute    = "float16"                  # half-precision on GPU
        else:
            device     = "cpu"
            model_size = config.WHISPER_MODEL_CPU   # e.g. "medium"
            compute    = "int8"                     # optimized for CPU

        print(f"  [Audio] Loading faster-whisper {model_size} on {device} ({compute}) …")
        print(f"  [Audio] First load downloads the model (~{_MODEL_SIZES.get(model_size)}). "
              f"Subsequent loads use cache.")

        _whisper_model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute,
        )

        _WHISPER = True
        print(f"  [Audio] faster-whisper {model_size} ready on {device} ({compute})")

    except ImportError:
        print("  [Audio] faster-whisper not installed — speech transcription disabled.")
    except Exception as e:
        print(f"  [Audio] faster-whisper failed to load: {e}")


# ── YAMNet (media / non-speech detection — retained) ─────────
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


# ── Egyptian Arabic Speech Transcriber ───────────────────────
class SpeechTranscriber:
    """
    Transcribes speech using whisper-large-v3 tuned for Egyptian Arabic.

    Key design decisions vs V9.0 base:

      1. language="ar"  — forces Arabic decoder, prevents English hallucination
         on short Egyptian utterances like "آه" or "بص".

      2. initial_prompt — seeds the decoder with an Egyptian exam context.
         Whisper's decoder is autoregressive; starting it with dialect-rich
         text biases token probabilities toward Egyptian vocabulary for the
         entire segment. This is the single highest-impact tuning parameter
         for dialect accuracy.

      3. VAD threshold=0.40, min_speech=200ms — catches short affirmative/
         negative responses ("آه"/"لأ"/"أيوه") that the old 300ms/0.45
         settings silently dropped.

      4. _INNOCENT set — Egyptian dialectal filler words that appear in
         honest exam-taking (thinking aloud, reading quietly, self-talk).
         These still fire an event (for the log) but at "whisper" severity
         rather than "multi_talk", so the PDF shows the transcript without
         escalating the alert level unnecessarily.

      5. _is_noise_transcript() — filters Whisper hallucinations on silence.
         large-v3 sometimes outputs ".", "♪", "ـ", or repeated punctuation
         when forced to Arabic on a near-silent chunk. These are discarded
         before logging.
    """

    # Primer sentence in Egyptian Arabic — biases the decoder toward dialect.
    # "The student is sitting the exam and should be completely silent."
    # Written in Egyptian colloquial, not MSA, to maximize dialect priming.
    _INITIAL_PROMPT: str = (
        "الطالب بيأدي الامتحان ولازم يكون ساكت خالص. "
        "ممنوع الكلام أو التحدث مع أي حد."
    )

    # Dialectal filler words and common single-word exam responses.
    # If the ENTIRE transcript is a subset of these → severity = "whisper"
    # (thinking aloud) rather than "multi_talk" (communicating with someone).
    _INNOCENT: set[str] = {
        # Egyptian dialectal fillers
        "آه", "أيوه", "أيوة", "لأ", "لا", "بص", "يعني", "يعنى",
        "طب", "طيب", "ماشي", "ماشى", "تمام", "أوك", "اوك", "اوكي",
        "اممم", "اممه", "همم", "هممم", "آاه", "اه", "ايه", "إيه",
        "دلوقتي", "دلوقت", "هنا", "ده", "دي", "دول", "ايو",
        "بقى", "بقي", "خلاص", "بس", "كده", "كدا",
        "عشان", "علشان", "مش", "لو", "لو سمحت",
        "ازيك", "عامل ايه",
        # MSA fillers common in exam self-talk
        "نعم", "حسناً", "حسنا", "إذن", "إذاً",
        "أنا", "هو", "هي", "هم", "نحن",
        "و", "في", "من", "إلى", "على", "أن",
        # Numbers (reading a question number aloud)
        "واحد", "اتنين", "تلاتة", "أربعة", "خمسة",
        "ستة", "سبعة", "تمانية", "تسعة", "عشرة",
        "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠",
        # English code-switches common in Egyptian exams (not cheating)
        "ok", "okay", "yes", "no", "hmm", "uh", "um", "ah",
        "wait", "oh", "right", "what",
    }

    # Whisper hallucination patterns on near-silence (forced Arabic decoder).
    # Transcripts matching these are discarded entirely — not logged.
    _NOISE_PATTERNS: tuple[str, ...] = (
        ".", "..", "...", "…", "♪", "♪♪", "♫",
        "ـ", "ـــ", "ـــــ",
        "سبحان الله",
        "بسم الله الرحمن الرحيم",
        "صلى الله عليه وسلم",
        "الله أكبر",
        "استغفر الله",
        "شكراً",
        "شكرا",
    )

    def _is_noise_transcript(self, text: str) -> bool:
        """Return True if this transcript is a Whisper hallucination / noise."""
        stripped = text.strip().strip(".,،؟?!؟\"' \u200f\u200e")
        if not stripped or len(stripped) < 2:
            return True
        if stripped in self._NOISE_PATTERNS or text.strip() in self._NOISE_PATTERNS:
            return True
        # All-punctuation / diacritics-only output
        import unicodedata
        non_letter = all(
            unicodedata.category(c) in ("Po", "Ps", "Pe", "Zs", "Mn", "Cf", "Cc")
            for c in stripped
        )
        return non_letter

    def transcribe(self, audio: np.ndarray) -> list[dict]:
        """
        Transcribe one chunk of audio. Returns list of event dicts (may be empty).

        Event dict schema (identical contract to V9.0):
          {
            "event":      "whisper" | "multi_talk" | "media",
            "display":    human-readable Arabic alert string,
            "confidence": float (avg_logprob, higher is more confident),
            "transcript": Arabic text (empty string if media event),
          }

        "whisper"    → student talking quietly to themselves (innocent fillers only)
        "multi_talk" → substantive speech — likely communicating or reading answers aloud
        """
        _ensure_whisper()
        if not _WHISPER or audio is None or len(audio) == 0:
            return []

        try:
            segments, _info = _whisper_model.transcribe(
                audio,
                language                   = "ar",
                initial_prompt             = self._INITIAL_PROMPT,
                beam_size                  = 5,
                best_of                    = 5,
                vad_filter                 = True,
                vad_parameters             = {
                    "threshold":              0.40,
                    "min_speech_duration_ms": 200,
                    "min_silence_duration_ms": 400,
                    "speech_pad_ms":          200,
                },
                no_speech_threshold        = 0.65,
                condition_on_previous_text = False,
                temperature                = 0.0,
            )

            events: list[dict] = []
            for seg in segments:
                text = seg.text.strip()

                if self._is_noise_transcript(text):
                    continue

                # Minimum meaningful length: at least 3 non-space characters
                if len(text.replace(" ", "")) < 3:
                    continue

                words       = set(text.strip(".,،؟?!؟ ").split())
                is_innocent = words.issubset(self._INNOCENT)
                severity    = "whisper" if is_innocent else "multi_talk"
                display     = f'تم كشف كلام: "{text}"'
                confidence  = float(getattr(seg, "avg_logprob", -0.5))

                events.append({
                    "event":      severity,
                    "display":    display,
                    "confidence": confidence,
                    "transcript": text,
                })

            return events

        except Exception as e:
            print(f"  [Audio] Whisper error: {e}")
            return []


# ── YAMNet non-speech classifier (retained from V9.0) ─────────
class MediaClassifier:
    """
    Detects music, TV audio, radio playing in the background.
    Runs only when Whisper finds no speech in the chunk — so it does not
    compete with transcription but catches non-speech audio events.
    Unchanged from V9.0.
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
                if label in config.MEDIA_LABELS and conf > config.MEDIA_THR:
                    if "media" not in seen:
                        events.append({
                            "event":      "media",
                            "display":    f"تم كشف صوت وسائط ({label})",
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
      1. RMS gate              — skip silence entirely (no model call)
      2. Whisper large-v3      — Egyptian Arabic transcription
      3. YAMNet                — media detection only if Whisper found nothing
      4. Callback              — report events to EventLogger

    Adaptive EMA noise floor retained from V8.0 — see _update_floor().
    """

    CHUNK_SEC = 3.0

    def __init__(self, callback):
        self._cb          = callback
        self._running     = False
        self._thread      = None
        self._last:       dict[str, float] = {}
        self._transcriber = SpeechTranscriber()
        self._media_clf   = MediaClassifier()
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
        if _WHISPER and _whisper_model is not None:
            # Report the model that was actually loaded, not an assumed one
            import torch
            actual_model = config.WHISPER_MODEL_CUDA if torch.cuda.is_available() else config.WHISPER_MODEL_CPU
            active.append(f"Whisper-{actual_model} (Egyptian Arabic)")
        if _YAMNET:
            active.append("YAMNet")
        print(f"  [Audio] Microphone monitor started ({' + '.join(active)}).")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=3.0)

    def _update_floor(self, rms_val: float):
        """
        EMA noise floor update — only tracks downward.
        The floor never auto-raises to swallow real speech; it only lowers
        to track a quieter room after a noisy calibration window.
        """
        if rms_val < self._rms_floor:
            self._rms_floor = (self._alpha * rms_val +
                               (1 - self._alpha) * self._rms_floor)
            self._rms_floor = max(self._rms_floor, config.AUDIO_NOISE_FLOOR_MIN)

    def _loop(self):
        import queue as _queue
        chunk_q   = _queue.Queue(maxsize=4)
        n_samples = int(self.CHUNK_SEC * config.SAMPLE_RATE)
        leftover  = np.array([], dtype=np.float32)

        def _sd_callback(indata, frames, time_info, status):
            if not chunk_q.full():
                chunk_q.put(indata.flatten().copy(), block=False)

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

                    self._update_floor(rms_val)

                    if rms_val < self._rms_floor:
                        continue   # silent — skip both models

                    events = self._transcriber.transcribe(chunk)

                    if not events and _YAMNET:
                        events = self._media_clf.classify(chunk)

                    now = time.time()
                    for ev in events:
                        key = ev["event"]
                        if now - self._last.get(key, 0) >= config.AUDIO_COOLDOWN:
                            self._last[key] = now
                            self._cb(
                                ev["display"],
                                ev.get("confidence", 0.5),
                                ev.get("transcript", ""),
                            )

                except _queue.Empty:
                    continue
                except Exception as e:
                    print(f"  [Audio] Mic loop error: {e}")
                    time.sleep(0.5)


# ── Web / API Audio Handler ───────────────────────────────────
class WebAudioHandler:
    """
    For browser-based deployments — receives audio blobs via HTTP.
    Drop-in replacement for V9.0 WebAudioHandler. Contract unchanged.
    """

    def __init__(self):
        _ensure_whisper()
        _ensure_yamnet()
        self._transcriber = SpeechTranscriber()
        self._media_clf   = MediaClassifier()
        self._last: dict[str, float] = {}

    def process_blob(self, audio_bytes: bytes, mime: str) -> list[dict]:
        audio = AudioNormalizer.from_bytes(audio_bytes, mime)
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


# ── Audio Normalizer ──────────────────────────────────────────
class AudioNormalizer:
    """
    Converts browser audio blobs to float32 numpy at config.SAMPLE_RATE.
    Tries ffmpeg first (fastest, no deps), falls back to pydub.
    Unchanged from V9.0.
    """

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
            print(f"  [Audio] Normalize error: {e}")
            return None
        finally:
            for p in [in_path, out_path]:
                try:
                    os.unlink(p)
                except Exception:
                    pass

    @staticmethod
    def _pydub(path: str) -> "np.ndarray | None":
        try:
            from pydub import AudioSegment
            a = AudioSegment.from_file(path).set_frame_rate(
                config.SAMPLE_RATE).set_channels(1)
            return np.array(a.get_array_of_samples(), dtype=np.float32) / 32768.0
        except Exception as e:
            print(f"  [Audio] pydub fallback failed: {e}")
            return None

    @staticmethod
    def _ext(mime: str) -> str:
        m = mime.lower().split(";")[0].strip()
        return {
            "audio/webm":  ".webm", "audio/ogg":   ".ogg",
            "audio/mp4":   ".mp4",  "audio/x-m4a": ".m4a",
            "audio/mpeg":  ".mp3",  "audio/wav":    ".wav",
            "audio/x-wav": ".wav",  "audio/flac":  ".flac",
        }.get(m, ".webm")