# ==============================================================
# detectors/dataset_collector.py  —  Random Snapshot Dataset Builder (V8.0)
# ==============================================================
#
# CHANGES vs V7.5:
#   - _write_queue changed from list to collections.deque.
#     Old: list.pop(0) is O(n) — shifts every element on every dequeue.
#     New: deque.popleft() is O(1) — constant time regardless of queue size.
#     At 200 snapshots per session this was negligible, but the fix is
#     trivially correct and eliminates the pathological case.
#
# Everything else retained from V7.5.
# ==============================================================

import os, json, time, random, threading
from collections import deque
import cv2
import numpy as np
from datetime import datetime
import config


# ── Config ───────────────────────────────────────────────────
DATASET_DIR          = os.path.join(config.BASE_DIR, "dataset")
DATASET_INTERVAL_SEC = 30.0
DATASET_JITTER_SEC   = 10.0
DATASET_ALERT_SNAP   = True
DATASET_QUALITY      = 88
DATASET_MAX_PER_SESS = 200
DATASET_RESIZE_W     = 640
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
    if "phone"  in item_name.lower(): return "alert_yolo_phone"
    if "person" in item_name.lower(): return "alert_yolo_person"
    return "alert_yolo_book"


class DatasetCollector:
    """
    Passive background collector. tick() called every frame from main loop.

    FIX (V8.0): _write_queue is now a collections.deque.
    pop(0) on a list is O(n) — replaced with deque + popleft() for O(1).
    """

    def __init__(self, session_id: str):
        self._session_id  = session_id
        self._snap_count  = 0
        self._lock        = threading.Lock()
        # FIX: deque instead of list for O(1) dequeue
        self._write_queue: deque = deque()
        self._writer      = threading.Thread(target=self._write_loop, daemon=True)
        self._running     = True
        self._writer.start()

        self._next_normal = time.time() + self._next_interval()
        self._alert_last: dict[str, float] = {}

        for cat in [NORMAL] + list(ALERT_MAP.values()) + [
                "alert_yolo_phone", "alert_yolo_person", "alert_yolo_book"]:
            os.makedirs(os.path.join(DATASET_DIR, cat), exist_ok=True)

        print(f"  [Dataset] Collector started → {DATASET_DIR}")

    # ── Public API ───────────────────────────────────────────
    def tick(self, frame, detector_state: dict, active_alerts: list[str] | None = None):
        if self._snap_count >= DATASET_MAX_PER_SESS:
            return

        active_alerts = active_alerts or []
        now = time.time()

        if now >= self._next_normal and not active_alerts:
            self._next_normal = now + self._next_interval()
            self._enqueue(frame, NORMAL, detector_state, active_alerts)

        if DATASET_ALERT_SNAP:
            for src in active_alerts:
                cat = ALERT_MAP.get(src.upper())
                if cat and now - self._alert_last.get(cat, 0) >= 30.0:
                    self._alert_last[cat] = now
                    self._enqueue(frame, cat, detector_state, active_alerts)

    def alert_snap(self, frame, source: str, event_type: str, detector_state: dict):
        if self._snap_count >= DATASET_MAX_PER_SESS:
            return
        if source.upper() == "YOLO":
            cat = _yolo_label(event_type)
        else:
            cat = ALERT_MAP.get(source.upper(), "alert_anomaly")
        self._enqueue(frame, cat, detector_state, [source])

    def summary(self) -> dict:
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
        with self._lock:
            if self._snap_count >= DATASET_MAX_PER_SESS:
                return
            self._snap_count += 1
            n = self._snap_count

        ts    = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        stem  = f"{self._session_id}_{ts}_{n:04d}"
        img_p = os.path.join(DATASET_DIR, category, stem + ".jpg")
        jso_p = os.path.join(DATASET_DIR, category, stem + ".json")

        small = cv2.resize(frame, (DATASET_RESIZE_W, DATASET_RESIZE_H),
                           interpolation=cv2.INTER_AREA)

        meta = {
            "session_id":    self._session_id,
            "timestamp":     ts,
            "category":      category,
            "active_alerts": alerts,
            "frame_w":       DATASET_RESIZE_W,
            "frame_h":       DATASET_RESIZE_H,
            "detectors":     _serialisable(state),
        }
        with self._lock:
            self._write_queue.append((img_p, small, jso_p, meta))

    def _write_loop(self):
        while self._running or self._write_queue:
            if not self._write_queue:
                time.sleep(0.05)
                continue
            with self._lock:
                # FIX: O(1) popleft instead of O(n) pop(0)
                item = self._write_queue.popleft()
            img_p, img, jso_p, meta = item
            try:
                cv2.imwrite(img_p, img, [cv2.IMWRITE_JPEG_QUALITY, DATASET_QUALITY])
                with open(jso_p, "w") as f:
                    json.dump(meta, f, indent=2)
            except Exception as e:
                print(f"  [Dataset] Write error: {e}")


def _serialisable(obj):
    if isinstance(obj, dict):
        return {k: _serialisable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialisable(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj
