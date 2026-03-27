# ==============================================================
# detectors/object_detector.py  —  YOLO on CUDA (RTX 3050/3060)
# ==============================================================
#
# Fixes vs V7.5 (retained):
#   - Warmup dummy is uint8 — YOLO expects raw pixel values 0-255.
#   - _run() never manually casts frame to float16.
#
# FIX (V9.0) — Lazy model loading:
#   Previously YOLO was loaded at MODULE IMPORT TIME:
#       _yolo = YOLO(config.YOLO_MODEL)   ← ran when backend did
#       _yolo.predict(_dummy, ...)         ← 'from proctoring_session import ...'
#   This added 2-5 seconds to every server start and worker spawn.
#
#   Now: model loads inside ObjectDetector.start(), called from
#   ProctoringSession._run() on a background thread.
#   Import is instant. Model loads only when a session starts,
#   on that session's background thread — never blocking the server.
#
#   Timeline per session:
#     import proctoring_session → 0ms   (was 2-5 seconds)
#     session.start()           → spawns thread
#     thread: YOLO loads        → 2-5s on background thread
#     (enrollment phase lasts ≥5s anyway — YOLO is ready in time)
# ==============================================================

import cv2, time, threading, numpy as np
from queue import Queue, Empty
import config

# Lightweight checks only — no model loading at import time
try:
    import torch
    _CUDA   = torch.cuda.is_available()
    _DEVICE = "cuda:0" if _CUDA else "cpu"
except ImportError:
    _CUDA   = False
    _DEVICE = "cpu"


class Detection:
    __slots__ = ("person_count", "items", "boxes", "ts")
    def __init__(self):
        self.person_count = 0
        self.items:  list[str]   = []
        self.boxes:  list[tuple] = []
        self.ts = time.time()


class ObjectDetector:
    """
    YOLO object detector with lazy model loading.

    Model, GPU transfer, and warmup all happen on the background thread
    spawned by start(). The calling thread is never blocked.
    """

    def __init__(self):
        self._q       = Queue(maxsize=2)
        self._latest  = Detection()
        self._lock    = threading.Lock()
        self._running = False
        self._thread  = None
        self._yolo    = None
        self._names   = {}
        self._yolo_ok = False

    def start(self):
        """Start background thread. Model loads on the thread — non-blocking."""
        self._running = True
        self._thread  = threading.Thread(target=self._load_and_run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread: self._thread.join(timeout=2.0)

    def enqueue(self, frame):
        """
        frame must be uint8 BGR — same dtype as cv2.VideoCapture output.
        Do NOT pre-cast to float; YOLO handles normalization internally.
        Silently drops frame if model not yet loaded or queue full.
        """
        if not self._yolo_ok:
            return
        if self._q.full():
            try: self._q.get_nowait()
            except Empty: pass
        self._q.put(frame)

    @property
    def result(self) -> Detection:
        with self._lock:
            return self._latest

    # ── Internal ─────────────────────────────────────────────

    def _load_model(self) -> bool:
        """Load YOLO model on the background thread. Returns True on success."""
        try:
            from ultralytics import YOLO
            yolo = YOLO(config.YOLO_MODEL)
            yolo.to(_DEVICE)
            if _CUDA:
                vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
                print(f"  [YOLO] Loaded '{config.YOLO_MODEL}' on {_DEVICE} · "
                      f"FP16 (via predict) · VRAM {vram_gb:.1f}GB")
            else:
                print(f"  [YOLO] Loaded '{config.YOLO_MODEL}' on CPU · FP32")
            try:
                dummy = np.zeros(
                    (config.YOLO_INPUT_H, config.YOLO_INPUT_W, 3), dtype=np.uint8)
                yolo.predict(dummy,
                             imgsz=(config.YOLO_INPUT_H, config.YOLO_INPUT_W),
                             verbose=False, half=_CUDA)
                print("  [YOLO] Warmup complete.")
            except Exception as e:
                print(f"  [YOLO] Warmup error (ignored): {e}")
            self._yolo    = yolo
            self._names   = yolo.names
            self._yolo_ok = True
            return True
        except Exception as e:
            print(f"  [YOLO] Not available: {e}")
            self._yolo_ok = False
            return False

    def _load_and_run(self):
        """Load model then immediately enter inference loop."""
        if self._load_model():
            self._run()

    def _run(self):
        while self._running:
            try: frame = self._q.get(timeout=0.5)
            except Empty: continue

            det = Detection()
            h, w = frame.shape[:2]
            try:
                preds = self._yolo.predict(
                    frame,
                    conf    = 0.25,
                    classes = config.YOLO_CLASSES,
                    imgsz   = (h, w),
                    half    = _CUDA,
                    verbose = False,
                    device  = _DEVICE,
                )
                for r in preds:
                    for box in r.boxes:
                        cls  = int(box.cls[0])
                        name = self._names.get(cls, str(cls))
                        conf = float(box.conf[0])

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        if (x2-x1) < config.YOLO_MIN_PX or \
                           (y2-y1) < config.YOLO_MIN_PX:
                            continue

                        box_w = x2 - x1
                        box_h = y2 - y1
                        if box_w > 0 and box_h > 0:
                            ratio = box_h / box_w
                            if name == "laptop":
                                if ratio > 0.75:
                                    name = "book"
                                else:
                                    continue
                            if name in ["document", "paper"]:
                                if 0.35 <= ratio <= 2.0:
                                    name = "book"
                                else:
                                    continue

                        req_conf = config.YOLO_CONFS.get(
                            name, getattr(config, 'YOLO_CONF_DEFAULT', 0.55))
                        if conf < req_conf:
                            continue

                        if box_w > 0 and box_h > 0:
                            ratio = box_h / box_w
                            if name == "cell phone" and 0.8 < ratio < 1.2:
                                continue
                            if name == "book":
                                if ratio < 0.25 or ratio > 2.5:
                                    continue

                        det.boxes.append((x1, y1, x2, y2, name, conf))

                        if name == "person":
                            det.person_count += 1
                        elif name in config.YOLO_FLAG_ITEMS:
                            det.items.append(name)

            except Exception as e:
                print(f"  [YOLO] Inference error: {e}")
            with self._lock:
                self._latest = det

    def draw(self, frame, det: Detection):
        out = frame.copy()
        for (x1, y1, x2, y2, name, conf) in det.boxes:
            col = (0, 200, 0) if name == "person" else (0, 0, 220)
            cv2.rectangle(out, (x1,y1), (x2,y2), col, 2)
            cv2.putText(out, f"{name} {conf:.2f}", (x1, y1-8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
        return out
