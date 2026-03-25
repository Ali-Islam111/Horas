# ==============================================================
# config.py  —  AI Proctoring System · All Settings (Optimized)
# ==============================================================

import os, numpy as np

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR   = os.path.join(BASE_DIR, "evidence")
REPORTS_DIR = os.path.join(BASE_DIR, "session_reports")  # FIX: was "reports" which collides with the reports/ Python package
MODELS_DIR  = os.path.join(BASE_DIR, "saved_models")
REF_DIR     = os.path.join(BASE_DIR, "reference_faces")
LOG_FILE    = os.path.join(BASE_DIR, "session.log")

for _d in [IMAGE_DIR, REPORTS_DIR, MODELS_DIR, REF_DIR]:
    os.makedirs(_d, exist_ok=True)

# ── Camera ────────────────────────────────────────────────────
CAMERA_INDEX      = 0
FRAME_W           = 1280
FRAME_H           = 720
TARGET_FPS        = 30

# ── Performance: frame subsampling ───────────────────────────
# Heavy detectors don't run every frame — they don't need to.
# Values = "run every N frames"
# At 30fps: every 1 = 30Hz, every 3 = 10Hz, every 6 = 5Hz
MEDIAPIPE_EVERY   = 1   # every frame  — lightweight enough
GLOW_EVERY        = 3   # 10Hz  — glow changes slowly
YOLO_EVERY        = 6   # 5Hz   — objects don't flash in and out

# ── Performance: YOLO input resolution ───────────────────────
# Full 1280x720 sent to YOLO wastes 4x the compute vs 640x360.
# Accuracy difference for phone/book/person detection: negligible.
YOLO_INPUT_W      = 640   # must be multiple of 32
YOLO_INPUT_H      = 384   # was 360 — 360 is NOT a multiple of 32, YOLO silently corrects to 384 every frame causing spam warnings. 384 = 32×12.

# ── Performance: camera buffer ────────────────────────────────
# OpenCV default buffers 3-4 frames → phantom lag.
# Setting to 1 ensures we always read the freshest frame.
CAM_BUFFER_SIZE   = 1

# ── Calibration ───────────────────────────────────────────────
CALIB_SECONDS     = 6       # was 4 — more data = better personal baseline
CALIB_FPS_EST     = 15
MAX_CALIB_WAIT    = 60.0    # seconds before skipping calibration if no face is found

# ── Head Pose (solvePnP) ──────────────────────────────────────
YAW_THRESHOLD     = 35.0    # natural head turn; 35° is well past casual glance
PITCH_THRESHOLD   = 28.0    # allows reading posture + thinking-down-look
ROLL_THRESHOLD    = 35.0    # head tilt; only flag extreme slouch
HEAD_SMOOTH_N     = 14      # smooth over ~0.5s at 30fps — kills jitter completely

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
# FIX: these constants are referenced by GazeDetector but were missing from config
GAZE_H_TOL    = 0.05   # tolerance added/subtracted from H_MIN/H_MAX before flagging
GAZE_V_TOL    = 0.05   # tolerance added/subtracted from V_MIN/V_MAX before flagging
GAZE_MIN_AWAY_FRAMES = 20  # ~0.67s of sustained look-away before flagging
                            # prevents normal reading saccades from triggering

# IMPROVEMENT: Adaptive gaze calibration
# GazeDetector collects the student's natural center-gaze during the head-pose
# calibration phase and computes a personal H/V center + half-width tolerance.
# These are the fallback values used before/if calibration doesn't converge.
GAZE_CALIB_FRAMES     = 40    # how many frames of center-gaze to collect
GAZE_CALIB_STD_MULT   = 4.5   # very wide personal zone; only flag clear deviations
GAZE_CALIB_MIN_RANGE  = 0.14  # minimum half-width of accepted gaze zone

IRIS_LEFT     = 468;   IRIS_RIGHT  = 473
EYE_L_OUTER   = 33;    EYE_L_INNER = 133
EYE_R_INNER   = 362;   EYE_R_OUTER = 263
EYE_L_TOP     = 159;   EYE_L_BOT   = 145
EYE_R_TOP     = 386;   EYE_R_BOT   = 374

# ── Lip ───────────────────────────────────────────────────────
LIP_TOP_ID    = 13;  LIP_BOT_ID   = 14
LIP_LEFT_ID   = 78;  LIP_RIGHT_ID = 308
LIP_OPEN_THR  = 0.042   # higher threshold; ignores slight mouth resting/breathing
LIP_CONSEC    = 30      # ~1s of sustained movement — rules out swallowing/yawning

# ── Glow ──────────────────────────────────────────────────────
# ── Glow (4-signal fusion detector) ─────────────────────────
# Signal 1: Brightness spike (V in HSV) — catches ALL screen colors
GLOW_V_SPIKE_MIN  = 12.0   # V units above baseline to start scoring
GLOW_V_SPIKE_MAX  = 40.0   # V units = full score
# Signal 2: Saturation drop — screen light desaturates skin
GLOW_S_DROP_MIN   = 8.0    # S-unit drop to start scoring
GLOW_S_DROP_MAX   = 30.0   # S-unit drop = full score
# Signal 3: Temporal flicker — screens change content constantly
GLOW_FLICKER_MIN  = 15.0   # brightness variance threshold
GLOW_FLICKER_MAX  = 80.0   # variance = full score
# Signal 4: BGR blue excess (original, now just one vote)
GLOW_BLUE_EXCESS  = 20;  GLOW_AREA_MIN = 0.10
# Fusion rule: weighted score + at least 2 signals firing
GLOW_FUSION_THR   = 0.52   # only trigger on clear strong screen glow
GLOW_SMOOTH       = 14     # ~0.5s of sustained glow needed before deciding

# ── Identity ──────────────────────────────────────────────────
ID_MODEL      = "ArcFace";  ID_BACKEND    = "retinaface"
ID_THRESHOLD  = 0.68;       ID_REF_FRAMES = 5
ID_CHECK_EVERY= 60

# ── YOLO ──────────────────────────────────────────────────────
YOLO_MODEL    = "yolo11n.pt"
YOLO_CONF_DEFAULT = 0.55
YOLO_CONFS    = {
    "person": 0.50,
    "cell phone": 0.65,  # Higher to prevent wallet/calculator mixups
    "book": 0.60
}
YOLO_CLASSES  = None          # detect ALL 80 COCO classes — do NOT filter here.
                               # Filtering by class ID at inference causes YOLO to only
                               # look for those 3 classes, making it over-eager and
                               # misclassifying similar-shaped objects (tissue→book, mouse→phone).
                               # Instead we detect everything and filter by name in code.
YOLO_FLAG_ITEMS = {"cell phone", "book"}  # only these trigger alerts — person is handled separately
YOLO_MIN_PX   = 50            # raised from 40 — ignore tiny detections (reflections, noise)

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

# ── Anomaly ───────────────────────────────────────────────────
IFOREST_WARMUP        = 120;  IFOREST_CONTAMINATION = 0.05
IFOREST_RETRAIN_EVERY = 300;  IFOREST_ANOMALY_THR   = -0.55
LSTM_SEQ_LEN          = 30;   LSTM_WARMUP_SEQS      = 50
LSTM_MSE_THR          = 0.065
# IMPROVEMENT: batch N sequences per predict() call to amortize TF overhead.
# At 30fps, batch=3 → inference at 10Hz. Anomalies develop over seconds, not frames.
LSTM_INFER_BATCH_SIZE = 3

ANOMALY_FEATURES = ["yaw_dev","pitch_dev","roll_dev",
                    "gaze_h","gaze_v","lip_lar","glow_score"]
N_FEATURES = len(ANOMALY_FEATURES)

# ── Attention ─────────────────────────────────────────────────
# Balance: decay and recovery should feel proportional to a human observer.
# Old: DECAY=3, RECOVER=1 → needed 3x as long to recover as to drop.
# New: DECAY=2, RECOVER=2 → symmetric; a ~10s clean stretch resets a single event.
ATTN_DECAY=1; ATTN_RECOVER=3; ATTN_MAX=100; ATTN_MIN=0  # decays slowly, recovers fast
# Require score below threshold for 5 consecutive ticks (was 3) before logging
ATTN_ALERT_THR=40; ATTN_SUSTAIN_TICKS=8  # only alert on very low sustained attention

# ── Alert cooldowns (seconds between repeated alerts of same type) ────────────
# All cooldowns are here — not hardcoded in main.py — so the web admin panel
# can expose them as tunable settings per exam without touching code.
# At 100 concurrent students, tuning one value here affects all sessions.
COOLDOWN_HEAD_AWAY   = 20.0   # min 20s between head-away repeat alerts
COOLDOWN_GAZE        = 20.0   # min 20s between gaze repeat alerts
COOLDOWN_LIP         = 25.0   # min 25s between lip movement alerts
COOLDOWN_BLINK       = 60.0
COOLDOWN_GLOW        = 30.0   # min 30s between screen glow alerts
COOLDOWN_NO_FACE     = 12.0   # min 12s between face-not-visible alerts
COOLDOWN_MULTI_PERSON= 15.0
COOLDOWN_YOLO_ITEM   = 15.0
COOLDOWN_IDENTITY    = 30.0
COOLDOWN_ANOMALY     = 30.0  # was 20s — anomaly models need time to stabilise
COOLDOWN_ATTN_SYSTEM = 60.0

# ── Scalability notes ─────────────────────────────────────────────────────────
# Current design: one Python process per student session.
# For 100 concurrent students → 100 processes, each using ~800MB RAM + 1 GPU stream.
# Recommended deployment for 100 students:
#   - 2× AWS g4dn.2xlarge (8 vCPU, 32GB RAM, 1× T4 GPU each) → ~$1.20/hr total
#   - Nginx load balancer in front, sticky sessions (one student = one worker)
#   - Redis for session state if you want a shared dashboard
#   - Each process writes its own session.log and evidence/ folder
# For future scaling beyond 100:
#   - Move YOLO and Whisper to dedicated microservices (gRPC)
#   - Use a shared GPU inference server (Triton Inference Server)
#   - Containerise each session with Docker + Kubernetes HPA

# ── Severity ──────────────────────────────────────────────────
SEV = {
    "head_away":2,"gaze_away":1,"lip_moving":1,"glow":2,
    "no_face":3,"multi_person":3,"phone":2,"book":2,
    "whisper":2,"multi_talk":2,"media":1,"identity":5,
    "iforest":2,"lstm":2,
}

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
    "LIP":"#2980b9","GLOW":"#f4a261","SYSTEM":"#6c757d","BLINK":"#e67e22",
}
