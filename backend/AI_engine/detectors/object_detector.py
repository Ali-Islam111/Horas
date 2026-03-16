# ==============================================================
# detectors/object_detector.py  —  YOLO on CUDA (RTX 3050/3060)
# ==============================================================
#
# Fixes vs GitHub version:
#   - Warmup dummy now uint8 (not float16) — YOLO expects raw pixel
#     values 0-255, not normalized floats. float16 caused silent
#     wrong detections on the first real frame.
#   - _run() no longer manually casts frame to float16 — YOLO does
#     this internally when half=True. Manual pre-cast produced pixel
#     values in the wrong range and poisoned detection accuracy.
#   - Both fixes together: always pass uint8 frames, let YOLO/CUDA
#     handle the precision conversion internally.
# ==============================================================

import cv2, time, threading, numpy as np
from queue import Queue, Empty
import config

try:
    import torch
    _CUDA   = torch.cuda.is_available()
    _DEVICE = "cuda:0" if _CUDA else "cpu"
except ImportError:
    _CUDA   = False
    _DEVICE = "cpu"

try:
    from ultralytics import YOLO
    _yolo = YOLO(config.YOLO_MODEL)
    _yolo.to(_DEVICE)

    if _CUDA:
        # Do NOT call _yolo.model.half() manually — on some ultralytics+torch
        # versions this causes a c10::Half != float dtype mismatch when the
        # uint8 input goes through the preprocessing pipeline.
        # Instead, let ultralytics handle FP16 internally via half=True in predict().
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"  [YOLO] Loaded '{config.YOLO_MODEL}' on {_DEVICE} · "
              f"FP16 (via predict) · VRAM {vram_gb:.1f}GB")
    else:
        print(f"  [YOLO] Loaded '{config.YOLO_MODEL}' on CPU · FP32")

    _YOLO_OK = True

    # Warmup: use uint8 — this is what real camera frames look like.
    # Do NOT use float16/float32 here; YOLO normalizes internally.
    try:
        _dummy = np.zeros(
            (config.YOLO_INPUT_H, config.YOLO_INPUT_W, 3), dtype=np.uint8
        )
        _yolo.predict(_dummy,
                      imgsz=(config.YOLO_INPUT_H, config.YOLO_INPUT_W),
                      verbose=False, half=_CUDA)
        print("  [YOLO] Warmup complete.")
    except Exception as e:
        print(f"  [YOLO] Warmup error (ignored): {e}")

    NAMES = _yolo.names

except Exception as e:
    _yolo = None; NAMES = {}; _YOLO_OK = False
    print(f"  [YOLO] Not available: {e}")


class Detection:
    __slots__ = ("person_count", "items", "boxes", "ts")
    def __init__(self):
        self.person_count = 0
        self.items:  list[str]   = []
        self.boxes:  list[tuple] = []
        self.ts = time.time()


class ObjectDetector:
    def __init__(self):
        self._q       = Queue(maxsize=2)
        self._latest  = Detection()
        self._lock    = threading.Lock()
        self._running = False
        self._thread  = None

    def start(self):
        if not _YOLO_OK: return
        self._running = True
        self._thread  = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread: self._thread.join(timeout=2.0)

    def enqueue(self, frame):
        """
        frame must be uint8 BGR — same dtype as cv2.VideoCapture output.
        Do NOT pre-cast to float; YOLO handles normalization internally.
        """
        if not _YOLO_OK: return
        if self._q.full():
            try: self._q.get_nowait()
            except Empty: pass
        self._q.put(frame)

    @property
    def result(self) -> Detection:
        with self._lock:
            return self._latest

    def _run(self):
        while self._running:
            try: frame = self._q.get(timeout=0.5)
            except Empty: continue

            det = Detection()
            h, w = frame.shape[:2]
            try:
                # Detect ALL classes — do not restrict by class ID here.
                # Restricting to [0,67,73] made YOLO over-eager for those
                # classes and caused tissue boxes → "book", mouse → "cell phone".
                # We detect everything and filter by exact name below.
                preds = _yolo.predict(
                    frame,
                    conf    = 0.25,                  # Base confidence to catch everything, filter later
                    classes = config.YOLO_CLASSES,   # None = all classes
                    imgsz   = (h, w),
                    half    = _CUDA,
                    verbose = False,
                    device  = _DEVICE,
                )
                for r in preds:
                    for box in r.boxes:
                        cls  = int(box.cls[0])
                        name = NAMES.get(cls, str(cls))
                        conf = float(box.conf[0])
                        
                        # Apply class-specific confidence threshold
                        req_conf = config.YOLO_CONFS.get(name, getattr(config, 'YOLO_CONF_DEFAULT', 0.55))
                        if conf < req_conf:
                            continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        if (x2-x1) < config.YOLO_MIN_PX or \
                           (y2-y1) < config.YOLO_MIN_PX:
                            continue
                        # Always track boxes for drawing
                        det.boxes.append((x1, y1, x2, y2, name, conf))
                        # Only count persons and exact flag items as alerts
                        if name == "person":
                            det.person_count += 1
                        elif name in config.YOLO_FLAG_ITEMS:
                            det.items.append(name)
                        # Everything else (mouse, tissue, cup, etc.) is detected
                        # and drawn on screen but does NOT trigger an alert
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
