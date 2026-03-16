# ==============================================================
# detectors/dataset_collector.py  —  Random Snapshot Dataset Builder
# ==============================================================
#
# Takes random frame snapshots during live sessions and saves them
# with structured labels for future model training and fine-tuning.
#
# What it collects:
#   - A frame snapshot every DATASET_INTERVAL_SEC seconds (randomised
#     ± DATASET_JITTER_SEC so the timing isn't predictable/gameable)
#     capture: head angles, gaze coords, lip/glow values,
#     attention score, and any active alert flags
#   - On alert events, immediately captures an "alert" snapshot
#     labelled with the alert type — these are the most valuable
#     training examples
#
# Output structure:
#   dataset/
#     normal/          ← frames where no alert was active
#       <session>_<ts>_<n>.jpg
#       <session>_<ts>_<n>.json
#     alert_head_away/
#       ...
#     alert_gaze/
#       ...
#     alert_lip/
#       ...
#     alert_glow/
#       ...
#     alert_yolo_phone/
#       ...
#     alert_yolo_person/
#       ...
#     alert_identity/
#       ...
#     alert_anomaly/
#       ...
#
# Usage:
#   collector = DatasetCollector(session_id)
#   # In main loop:
#   collector.tick(frame, detector_state, active_alerts)
#   # On shutdown:
#   collector.summary()
#
# The dataset folder is self-contained and ready to be:
#   - Uploaded to S3/GCS for centralised collection across exams
#   - Fed into a YOLO fine-tuning pipeline (convert JSONs to YOLO txt)
#   - Used to retrain the IForest/LSTM models with real-world data
#   - Reviewed by human annotators via a simple web labelling tool
# ==============================================================

import os, json, time, random, threading
import cv2
import numpy as np
from datetime import datetime
import config


# ── Config (add to config.py if you want runtime control) ────
DATASET_DIR          = os.path.join(config.BASE_DIR, "dataset")
DATASET_INTERVAL_SEC = 30.0   # average seconds between normal snapshots
DATASET_JITTER_SEC   = 10.0   # ± random jitter so timing can't be gamed
DATASET_ALERT_SNAP   = True   # also snap on every unique alert type
DATASET_QUALITY      = 88     # JPEG quality 0-100
DATASET_MAX_PER_SESS = 200    # max snapshots per session (avoid disk flood)
DATASET_RESIZE_W     = 640    # resize before saving (saves disk, still useful)
DATASET_RESIZE_H     = 360


# ── Label categories ──────────────────────────────────────────
NORMAL    = "normal"
ALERT_MAP = {
    "EYE/HEAD": "alert_head_away",
    "GAZE":     "alert_gaze",
    "LIP":      "alert_lip",
    "GLOW":     "alert_glow",
    "IDENTITY": "alert_identity",
    "ANOMALY":  "alert_anomaly",
}
def _yolo_label(item_name: str) -> str:
    if "phone" in item_name.lower(): return "alert_yolo_phone"
    if "person" in item_name.lower(): return "alert_yolo_person"
    return "alert_yolo_book"


class DatasetCollector:
    """
    Passive background collector. tick() is called every frame from
    the main loop — it only does real work when the snapshot timer fires
    or an alert snapshot is requested. Everything is non-blocking:
    disk I/O happens on a background thread.
    """

    def __init__(self, session_id: str):
        self._session_id  = session_id
        self._snap_count  = 0
        self._lock        = threading.Lock()
        self._write_queue: list[tuple] = []   # (path, img, meta)
        self._writer      = threading.Thread(target=self._write_loop, daemon=True)
        self._running     = True
        self._writer.start()

        # Timer for normal snapshots
        self._next_normal = time.time() + self._next_interval()

        # Per-alert-type cooldown to avoid 50 identical alert frames
        self._alert_last: dict[str, float] = {}

        # Create all category folders
        for cat in [NORMAL] + list(ALERT_MAP.values()) + [
                "alert_yolo_phone", "alert_yolo_person", "alert_yolo_book"]:
            os.makedirs(os.path.join(DATASET_DIR, cat), exist_ok=True)

        print(f"  [Dataset] Collector started → {DATASET_DIR}")

    # ── Public API ───────────────────────────────────────────
    def tick(self,
             frame,
             detector_state: dict,
             active_alerts:  list[str] | None = None):
        """
        Call every frame from the main loop.

        frame           : current BGR frame (uint8)
        detector_state  : dict with all detector values (head/gaze/lip/glow/attn)
        active_alerts   : list of source strings currently alerting, e.g. ["GAZE","LIP"]
        """
        if self._snap_count >= DATASET_MAX_PER_SESS:
            return

        active_alerts = active_alerts or []
        now = time.time()

        # ── Normal snapshot timer ─────────────────────────
        if now >= self._next_normal and not active_alerts:
            self._next_normal = now + self._next_interval()
            self._enqueue(frame, NORMAL, detector_state, active_alerts)

        # ── Alert snapshots ───────────────────────────────
        if DATASET_ALERT_SNAP:
            for src in active_alerts:
                cat = ALERT_MAP.get(src.upper())
                if cat and now - self._alert_last.get(cat, 0) >= 30.0:
                    self._alert_last[cat] = now
                    self._enqueue(frame, cat, detector_state, active_alerts)

    def alert_snap(self, frame, source: str, event_type: str,
                   detector_state: dict):
        """
        Called immediately when an alert is logged (from EventLogger or main loop).
        Captures a guaranteed snapshot for high-value alert moments.
        """
        if self._snap_count >= DATASET_MAX_PER_SESS:
            return
        # YOLO items have their own labels
        if source.upper() == "YOLO":
            cat = _yolo_label(event_type)
        else:
            cat = ALERT_MAP.get(source.upper(), "alert_anomaly")
        self._enqueue(frame, cat, detector_state, [source])

    def summary(self) -> dict:
        """Print and return collection stats at session end."""
        self._running = False
        self._writer.join(timeout=5.0)
        cats = {}
        for cat in os.listdir(DATASET_DIR):
            cat_path = os.path.join(DATASET_DIR, cat)
            if os.path.isdir(cat_path):
                n = len([f for f in os.listdir(cat_path) if f.endswith(".jpg")])
                if n > 0:
                    cats[cat] = n
        total = sum(cats.values())
        print(f"\n  [Dataset] Session collected {self._snap_count} snapshots")
        for cat, n in sorted(cats.items(), key=lambda x: -x[1]):
            print(f"           {cat:<28} {n:>4} frames")
        print(f"           {'TOTAL':<28} {total:>4} frames → {DATASET_DIR}")
        return {"session": self._session_id, "total": total, "by_category": cats}

    # ── Internal ─────────────────────────────────────────────
    @staticmethod
    def _next_interval() -> float:
        return DATASET_INTERVAL_SEC + random.uniform(
            -DATASET_JITTER_SEC, DATASET_JITTER_SEC)

    def _enqueue(self, frame, category: str, state: dict, alerts: list):
        """Prepare snapshot — resize immediately (in main thread), queue write."""
        with self._lock:
            if self._snap_count >= DATASET_MAX_PER_SESS:
                return
            self._snap_count += 1
            n = self._snap_count

        ts    = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        stem  = f"{self._session_id}_{ts}_{n:04d}"
        img_p = os.path.join(DATASET_DIR, category, stem + ".jpg")
        jso_p = os.path.join(DATASET_DIR, category, stem + ".json")

        # Resize in main thread (fast numpy op) — avoid blocking writer
        small = cv2.resize(frame, (DATASET_RESIZE_W, DATASET_RESIZE_H),
                           interpolation=cv2.INTER_AREA)

        meta = {
            "session_id": self._session_id,
            "timestamp":  ts,
            "category":   category,
            "active_alerts": alerts,
            "frame_w":    DATASET_RESIZE_W,
            "frame_h":    DATASET_RESIZE_H,
            "detectors":  _serialisable(state),
        }
        with self._lock:
            self._write_queue.append((img_p, small, jso_p, meta))

    def _write_loop(self):
        """Background thread — drains the write queue to disk."""
        while self._running or self._write_queue:
            if not self._write_queue:
                time.sleep(0.05)
                continue
            with self._lock:
                item = self._write_queue.pop(0)
            img_p, img, jso_p, meta = item
            try:
                cv2.imwrite(img_p, img, [cv2.IMWRITE_JPEG_QUALITY, DATASET_QUALITY])
                with open(jso_p, "w") as f:
                    json.dump(meta, f, indent=2)
            except Exception as e:
                print(f"  [Dataset] Write error: {e}")


def _serialisable(obj):
    """Recursively make a dict JSON-safe (convert numpy types)."""
    if isinstance(obj, dict):
        return {k: _serialisable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialisable(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj
