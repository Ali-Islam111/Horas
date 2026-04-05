# ==============================================================
# config.py  —  AI Proctoring System · All Settings (V8.0)
# ==============================================================
#
# CHANGES vs V7.5:
#   - ANOMALY_EVERY: rate-gate anomaly updates (was every frame → 2Hz)
#   - TUNING_HINTS_FILE: offline trainer writes suggested LSTM threshold
#     here; config.py reads it at startup to stay in sync with the model
#   - ATTN_HISTORY_MAX: cap attention history (was unbounded → 18,000)
#   - AUDIO_NOISE_FLOOR_EMA_ALPHA: adaptive noise floor (was locked at
#     calibration → slowly tracks room noise over the session)
#   - GEMINI_MODELS: ordered fallback list (was a single model string)
#   - COOLDOWN_NO_ENROLLMENT: new alert for enrollment-failure sessions
#   - SEV["no_enrollment"]: severity for the above
# ==============================================================

import os, json
import numpy as np

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR   = os.path.join(BASE_DIR, "evidence")
REPORTS_DIR = os.path.join(BASE_DIR, "session_reports")
MODELS_DIR  = os.path.join(BASE_DIR, "saved_models")
REF_DIR     = os.path.join(BASE_DIR, "reference_faces")
LOG_FILE    = os.path.join(BASE_DIR, "session.log")
TUNING_HINTS_FILE = os.path.join(MODELS_DIR, "tuning_hints.json")

for _d in [IMAGE_DIR, REPORTS_DIR, MODELS_DIR, REF_DIR]:
    os.makedirs(_d, exist_ok=True)

# ── Camera ────────────────────────────────────────────────────
CAMERA_INDEX      = 0
FRAME_W           = 1280
FRAME_H           = 720
TARGET_FPS        = 30

# ── Performance: frame subsampling ───────────────────────────
MEDIAPIPE_EVERY   = 1
YOLO_EVERY        = 6

# FIX (V8.0): Anomaly models don't need 30Hz updates.
# At 30fps, every 15 frames = 2Hz — anomalies develop over seconds,
# not frames. Saves ~5ms/frame of CPU with no detection quality loss.
ANOMALY_EVERY     = 15

# ── Performance: YOLO resolution ─────────────────────────────
YOLO_INPUT_W      = 640
YOLO_INPUT_H      = 384

# ── Performance: camera buffer ────────────────────────────────
CAM_BUFFER_SIZE   = 1

# ── Calibration ───────────────────────────────────────────────
CALIB_SECONDS     = 6
CALIB_FPS_EST     = 15

# ── Head Pose (solvePnP) ──────────────────────────────────────
YAW_THRESHOLD     = 35.0
PITCH_THRESHOLD   = 28.0
ROLL_THRESHOLD    = 35.0
HEAD_SMOOTH_N     = 14

FACE_3D = np.array([
    (  0.0,    0.0,    0.0),
    (  0.0, -330.0,  -65.0),
    (-225.0,  170.0, -135.0),
    ( 225.0,  170.0, -135.0),
    (-150.0, -150.0, -125.0),
    ( 150.0, -150.0, -125.0),
], dtype=np.float64)

FACE_LM_IDS = [1, 152, 33, 263, 61, 291]

# ── Gaze ─────────────────────────────────────────────────────
GAZE_H_MIN    = 0.35;  GAZE_H_MAX  = 0.65
GAZE_V_MIN    = 0.38;  GAZE_V_MAX  = 0.62
GAZE_SMOOTH   = 6
GAZE_H_TOL    = 0.04
GAZE_V_TOL    = 0.04
GAZE_MIN_AWAY_FRAMES = 25

GAZE_CALIB_FRAMES     = 60
GAZE_CALIB_STD_MULT   = 3.0
GAZE_CALIB_MIN_RANGE  = 0.12

IRIS_LEFT     = 468;   IRIS_RIGHT  = 473
EYE_L_OUTER   = 33;    EYE_L_INNER = 133
EYE_R_INNER   = 362;   EYE_R_OUTER = 263
EYE_L_TOP     = 159;   EYE_L_BOT   = 145
EYE_R_TOP     = 386;   EYE_R_BOT   = 374

# ── Lip ───────────────────────────────────────────────────────
LIP_TOP_ID    = 13;  LIP_BOT_ID   = 14
LIP_LEFT_ID   = 78;  LIP_RIGHT_ID = 308
LIP_OPEN_THR  = 0.042
LIP_CONSEC    = 30

# ── Identity ──────────────────────────────────────────────────
ID_MODEL       = "ArcFace";  ID_BACKEND     = "retinaface"
ID_THRESHOLD   = 0.75        # raised from 0.68 — was causing false mismatches on same person
ID_REF_FRAMES  = 15          # frames per angle during guided enrollment (3 angles × 15 = 45 total)
ID_CHECK_EVERY = 60

# ── YOLO — Dual Model ─────────────────────────────────────────
# Model 1: fine-tuned proctoring model — detects exam-specific objects
#   0=Book  1=Earphone  2=Mobile_phone  3=cap  4=headset  5=smart_watch  6=sunglasses
YOLO_MODEL_PROCTOR = os.path.join(MODELS_DIR, "yolo_proctoring.pt")
YOLO_CONFS_PROCTOR = {
    "Book":         0.60,
    "Mobile_phone": 0.80,
    "Earphone":     0.60,
    "headset":      0.60,
    "smart_watch":  0.60,
    "sunglasses":   0.55,
    "cap":          0.55,
}
YOLO_CLASSES_PROCTOR = [0, 1, 2, 3, 4, 5, 6]
YOLO_FLAG_ITEMS      = {"Mobile_phone", "Book", "Earphone", "headset", "smart_watch"}

# Model 2: COCO yolo11n — used ONLY for person count (multi-person detection)
YOLO_MODEL_COCO      = "yolo11n.pt"
YOLO_CONF_PERSON     = 0.75   # high conf for person to avoid false multi-person alerts
YOLO_CLASSES_COCO    = [0]    # person=0 only

YOLO_CONF_DEFAULT    = 0.55
YOLO_INPUT_W         = 640
YOLO_INPUT_H         = 384
YOLO_MIN_PX          = 80

# ── LLM Vision Verifier (disabled — reserved for future use) ──
LLM_VERIFIER_ENABLED  = False

# ── Audio ─────────────────────────────────────────────────────
SAMPLE_RATE   = 16000;  AUDIO_CHUNK_SEC = 1;  AUDIO_COOLDOWN = 10.0
WHISPER_THR   = 0.35;   TALK_THR = 0.45;      MEDIA_THR = 0.50

WHISPER_LABELS = {"Whispering", "Whispering, whistling"}
TALK_LABELS    = {"Conversation", "Chatter", "Speech", "Narration, monologue"}
MEDIA_LABELS   = {"Music", "Singing", "Television", "Radio"}

AUDIO_MIME_PRIORITY = [
    "audio/webm;codecs=opus", "audio/webm",
    "audio/ogg;codecs=opus",  "audio/ogg",
    "audio/mp4;codecs=mp4a.40.2", "audio/mp4",
    "audio/wav", "audio/x-wav",
]

# WHISPER_MODEL_CUDA:
#   Model used when a CUDA GPU is detected.
#   "large-v3" is the best available for Egyptian dialect.
#   VRAM usage: ~3.0 GB at float16 — leaves headroom for YOLO on the same GPU.
#   Do NOT change to "large-v2" — v3 has better Arabic dialect coverage.
#
# WHISPER_MODEL_CPU:
#   Model used on CPU (deployment without GPU, or local testing).
#   "medium" is the minimum viable size for Egyptian dialect on CPU.
#   "tiny"/"base" are NOT used — their MSA bias is the core problem.
#   CPU inference on a 3s chunk: ~2-4s on i5/i7 (borderline real-time).
#
# WHISPER_LANGUAGE:
#   Force the decoder to Arabic tokens. Without this, Whisper sometimes
#   hallucinates English for short Egyptian utterances.
#
# WHISPER_BEAM_SIZE / WHISPER_BEST_OF:
#   Larger beam = better dialect accuracy at cost of ~20% more inference time.
#   beam_size=5, best_of=5 is the sweet spot for exam-room audio quality.
#
# WHISPER_VAD_THRESHOLD:
#   Silero VAD sensitivity. 0.40 (vs default 0.45) catches short Egyptian
#   affirmatives: "آه", "لأ", "أيوه" that the old threshold clipped.
#
# WHISPER_MIN_SPEECH_MS:
#   200ms catches single-word responses. Old value was 300ms.
 
WHISPER_MODEL_CUDA    = "small"
WHISPER_MODEL_CPU     = "medium"
WHISPER_LANGUAGE      = "ar"
WHISPER_BEAM_SIZE     = 5
WHISPER_BEST_OF       = 5
WHISPER_VAD_THRESHOLD = 0.40
WHISPER_MIN_SPEECH_MS = 200
 
# ── Audio: Egyptian Arabic initial decoder prompt ─────────────
#
# This sentence is passed as initial_prompt to Whisper's decoder.
# Being autoregressive, the decoder's token probabilities for the
# entire segment are influenced by this starting context.
# Written in Egyptian colloquial Arabic (not MSA) to maximize
# the dialect prior. Do not translate to MSA — it reduces accuracy.
#
# Translation: "The student is sitting the exam and must be completely
#               silent. Speaking or talking to anyone is not allowed."
 
WHISPER_INITIAL_PROMPT = (
    "الطالب بيأدي الامتحان ولازم يكون ساكت خالص. "
    "ممنوع الكلام أو التحدث مع أي حد."
)

# FIX (V8.0): Adaptive noise floor using exponential moving average.
# Old approach: lock in a floor after a 6-second calibration window.
# Problem: if calibration happens in a noisy moment, the floor is too
#          high and real speech is masked for the rest of the session.
# New approach: floor decays toward quieter measurements continuously.
#   alpha=0.02 → ~2% update per 3s chunk → graceful tracking.
#   min_floor prevents the floor from reaching zero in a silent room.
AUDIO_NOISE_FLOOR_EMA_ALPHA = 0.02
AUDIO_NOISE_FLOOR_MIN       = 0.005

# ── Anomaly ───────────────────────────────────────────────────
IFOREST_WARMUP        = 120;  IFOREST_CONTAMINATION = 0.05
IFOREST_RETRAIN_EVERY = 300;  IFOREST_ANOMALY_THR   = -0.55
LSTM_SEQ_LEN          = 30;   LSTM_WARMUP_SEQS      = 50
LSTM_MSE_THR          = 500.0
LSTM_INFER_BATCH_SIZE = 3

# FIX (V8.0): Load LSTM threshold from tuning hints file if present.
# The offline trainer writes a suggested threshold after each run.
# Loading it at startup keeps config in sync with the actual model.
def _load_tuning_hints():
    global LSTM_MSE_THR
    try:
        if os.path.exists(TUNING_HINTS_FILE):
            with open(TUNING_HINTS_FILE) as f:
                hints = json.load(f)
            suggested = hints.get("lstm_mse_thr")
            if isinstance(suggested, (int, float)) and suggested > 0:
                LSTM_MSE_THR = float(suggested)
                print(f"  [Config] LSTM_MSE_THR loaded from tuning hints: {LSTM_MSE_THR:.2f}")
    except Exception as e:
        print(f"  [Config] Could not load tuning hints: {e}")

_load_tuning_hints()

ANOMALY_FEATURES = ["yaw_dev","pitch_dev","roll_dev",
                    "gaze_h","gaze_v","lip_lar"]
N_FEATURES = len(ANOMALY_FEATURES)

# ── Attention ─────────────────────────────────────────────────
ATTN_DECAY=1; ATTN_RECOVER=3; ATTN_MAX=100; ATTN_MIN=0
ATTN_ALERT_THR=40; ATTN_SUSTAIN_TICKS=8

# FIX (V8.0): Cap attention history to prevent unbounded memory growth.
# 3-hour exam × 30fps × 1 tick/frame = 324,000 unbounded entries.
# The sparkline uses ≤90 and band stats are computed from all entries.
# 18,000 = 10 minutes of data at 30fps — more than enough resolution.
ATTN_HISTORY_MAX = 18_000

# ── Alert cooldowns ───────────────────────────────────────────
COOLDOWN_HEAD_AWAY    = 20.0
COOLDOWN_GAZE         = 20.0
COOLDOWN_LIP          = 25.0
COOLDOWN_BLINK        = 60.0
COOLDOWN_NO_FACE      = 12.0
FACE_ABSENT_WARN_SEC  = 12   # seconds before "may have left" warning
FACE_ABSENT_GONE_SEC  = 30   # seconds before "student left" high alert
FACE_ABSENT_CRIT_SEC  = 60   # seconds before critical escalation to proctor
COOLDOWN_MULTI_PERSON = 15.0
COOLDOWN_YOLO_ITEM    = 15.0
COOLDOWN_UNKNOWN_OBJ  = 120.0  # capture once per 2 min — unknown objects logged but not spammed
COOLDOWN_IDENTITY     = 30.0
COOLDOWN_ANOMALY      = 30.0
COOLDOWN_ATTN_SYSTEM  = 60.0

# FIX (V8.0): When a student fails enrollment, fire a periodic alert
# every 2 minutes so the exam is never silently unmonitored for identity.
COOLDOWN_NO_ENROLLMENT = 120.0

# ── Severity ──────────────────────────────────────────────────
SEV = {
    "head_away":2,"gaze_away":1,"lip_moving":1,
    "no_face":3,
    "face_absent_warn": 3,
    "face_absent_gone": 4,
    "face_absent_crit": 5,
    "multi_person":3,"phone":2,"book":2,
    "whisper":2,"multi_talk":2,"media":1,"identity":5,
    "iforest":2,"lstm":2,
    "no_enrollment":3,
    "unknown_object":1,  # low severity — logged for report, not a hard alert
}

# ── Scalability notes ─────────────────────────────────────────
# V8.0 design: one Python process per student session.
# Per-session FaceMesh (no shared lock) is the key change enabling
# true parallelism at 100+ concurrent students.
# See proctoring_session.py for the per-instance FaceMesh pattern.

# ── Report ────────────────────────────────────────────────────
REPORT_LOGO_TEXT = "AI PROCTORING SYSTEM"
REPORT_COLORS = {
    "primary":"#0d1b2a","accent":"#e63946","accent2":"#457b9d",
    "green":"#2dc653","yellow":"#f4a261","purple":"#7b2d8b",
    "teal":"#1a936f","light_bg":"#f4f6f9","border":"#dde2ea","muted":"#6c757d",
}
CATEGORY_COLORS = {
    "EYE/HEAD":"#e67e22","GAZE":"#e67e22","IDENTITY":"#8e44ad",
    "AUDIO":"#2980b9","YOLO":"#e63946","ANOMALY":"#1a936f",
    "LIP":"#2980b9","SYSTEM":"#6c757d","BLINK":"#e67e22","UNKNOWN":"#95a5a6",
}
