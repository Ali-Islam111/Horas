# ==============================================================
# detectors/llm_verifier.py  —  Zero-lag LLM Vision Secondary Review (V8.0)
# ==============================================================
#
# CHANGES vs V7.5:
#   - Model selection uses config.GEMINI_MODELS (ordered fallback list)
#     instead of the single hard-coded "gemini-1.5-flash-latest" string.
#     If the primary model returns a 404 / model-not-found error, the
#     verifier retries each fallback in order before giving up and
#     returning True (fail-safe: keep the YOLO alert).
#   - _call_gemini_with_fallback() replaces _call_gemini() to implement
#     the above retry logic cleanly.
#
# Design unchanged from V7.5:
#   - All LLM calls run on a background ThreadPoolExecutor.
#   - Caller gets a Future immediately, then polls it.
#   - If LLM says NO → alert discarded.
#   - If LLM says YES, times out, or errors → alert kept (fail-safe).
# ==============================================================

import io, base64, threading, time
from concurrent.futures import Future, ThreadPoolExecutor
import cv2, numpy as np
import config

try:
    import google.generativeai as genai
    if config.GEMINI_API_KEY:
        genai.configure(api_key=config.GEMINI_API_KEY)
        _GENAI_OK = True
    else:
        _GENAI_OK = False
        print("  [LLMVerifier] GEMINI_API_KEY is empty — LLM verification disabled.")
except ImportError:
    _GENAI_OK = False
    print("  [LLMVerifier] google-generativeai not installed — LLM verification disabled.")


_PROMPTS = {
    "cell phone": (
        "You are an AI exam proctor. A student's webcam frame was flagged by "
        "a lower-level AI as containing a CELL PHONE which could be used to cheat.\n"
        "Look very carefully at the cropped image.\n"
        "Could this object actually be a cell phone or smartphone?\n"
        "Ignore computer mice, keyboards, notepads, pens, and books.\n"
        "Reply with EXACTLY one word: YES if it is a phone, NO if it is not."
    ),
    "book": (
        "You are an AI exam proctor. A student's webcam frame was flagged by "
        "a lower-level AI as containing a BOOK or printed material that is not allowed.\n"
        "Look very carefully at the cropped image.\n"
        "Could this object actually be a book, notebook, or printed exam sheet?\n"
        "Ignore tissue boxes, mouse pads, empty paper, laptop computers, or office supplies.\n"
        "Reply with EXACTLY one word: YES if it is a book/notebook, NO if it is not."
    ),
}


def _encode_frame_to_b64(crop: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _call_gemini_with_fallback(crop: np.ndarray, label: str) -> bool:
    """
    FIX (V8.0): Try each model in config.GEMINI_MODELS in order.
    Falls back to the next model on 404 / model-not-found errors.
    Returns True (keep alert) on all other errors or total exhaustion.

    V7.5 used a single hard-coded "gemini-1.5-flash-latest" — if Google
    deprecates that string, all YOLO double-checks silently fail-open
    (keeping every detection without verification) with only an error
    message in the console. This version retries with stable model names.
    """
    prompt = _PROMPTS.get(label, f"Is this a {label}? Reply YES or NO.")
    b64    = _encode_frame_to_b64(crop)

    for model_name in config.GEMINI_MODELS:
        try:
            model    = genai.GenerativeModel(model_name)
            response = model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": b64},
            ])
            answer    = response.text.strip().upper()
            confirmed = "YES" in answer
            verdict   = "CONFIRMED" if confirmed else "REJECTED"
            print(f"  [LLMVerifier] '{label}' via {model_name} — {answer} → {verdict}")
            return confirmed
        except Exception as e:
            err_str = str(e).lower()
            # Only continue to next model on model-availability errors
            if any(kw in err_str for kw in ["404", "not found", "deprecated",
                                             "model_not_found", "invalid model"]):
                print(f"  [LLMVerifier] Model '{model_name}' not available: {e} — trying next")
                continue
            # Any other error (network, quota, auth) → fail-safe keep alert
            print(f"  [LLMVerifier] Error verifying '{label}': {e} — keeping alert")
            return True

    print(f"  [LLMVerifier] All models exhausted for '{label}' — keeping alert")
    return True


class LLMVerifier:
    """
    Thread-pool based LLM verifier.
    Wraps _call_gemini_with_fallback in a ThreadPoolExecutor.
    """

    def __init__(self):
        self._pool    = ThreadPoolExecutor(max_workers=2,
                                           thread_name_prefix="llm-verify")
        self._enabled = _GENAI_OK and getattr(config, "LLM_VERIFIER_ENABLED", False)

        if self._enabled:
            print("  [LLMVerifier] Ready — Gemini will double-check YOLO detections.")
            print(f"  [LLMVerifier] Model order: {config.GEMINI_MODELS}")
        else:
            print("  [LLMVerifier] Disabled — YOLO detections are trusted directly.")

    def submit(self, crop: np.ndarray, label: str) -> Future:
        """
        Submit a crop for async LLM verification.
        Returns a Future[bool]: True = keep alert, False = discard alert.
        If LLM disabled, returns a pre-resolved Future(True).
        """
        if not self._enabled or label not in getattr(config, "LLM_VERIFY_CLASSES", set()):
            f: Future = Future()
            f.set_result(True)
            return f

        crop_copy = crop.copy()
        return self._pool.submit(_call_gemini_with_fallback, crop_copy, label)

    def shutdown(self):
        self._pool.shutdown(wait=False)
