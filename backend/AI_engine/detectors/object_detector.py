# ==============================================================
# detectors/object_detector.py  —  Dual YOLO Object Detector
# ==============================================================
#
# V10.0 architecture — two models running in ONE background thread:
#
#   Model A: yolo_proctoring.pt  (fine-tuned)
#     Detects exam-specific prohibited items:
#       0=Book  1=Earphone  2=Mobile_phone  3=cap
#       4=headset  5=smart_watch  6=sunglasses
#     Any detection NOT in YOLO_FLAG_ITEMS → logged as UNKNOWN OBJECT
#     (one crop saved for report, not a hard alert, cooldown 2 min)
#
#   Model B: yolo11n.pt  (COCO)
#     Used ONLY to count persons in frame.
#     No other COCO classes are used or reported.
#
# Both models share one background thread and frame queue.
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


class Detection:
    __slots__ = ("person_count", "items", "boxes", "unknown_capture", "ts")
    def __init__(self):
        self.person_count                       = 0
        self.items:  list[str]                  = []
        self.boxes:  list[tuple]                = []
        self.unknown_capture: "np.ndarray|None" = None  # crop of first unknown object seen
        self.ts = time.time()


class ObjectDetector:
    def __init__(self):
        self._q       = Queue(maxsize=2)
        self._latest  = Detection()
        self._lock    = threading.Lock()
        self._running = False
        self._thread  = None
        self._yolo_p  = None   # proctoring fine-tuned
        self._yolo_c  = None   # COCO person-only
        self._names_p = {}
        self._ready   = False

    def start(self):
        self._running = True
        self._thread  = threading.Thread(target=self._load_and_run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def enqueue(self, frame):
        if not self._ready:
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

    def _load(self, path):
        from ultralytics import YOLO
        m = YOLO(path)
        m.to(_DEVICE)
        return m

    def _warmup(self, model):
        try:
            dummy = np.zeros(
                (config.YOLO_INPUT_H, config.YOLO_INPUT_W, 3), dtype=np.uint8)
            model.predict(dummy,
                          imgsz=(config.YOLO_INPUT_H, config.YOLO_INPUT_W),
                          verbose=False, half=_CUDA)
        except Exception as e:
            print(f"  [YOLO] Warmup error (ignored): {e}")

    def _load_and_run(self):
        try:
            print(f"  [YOLO] Loading proctoring model …")
            self._yolo_p  = self._load(config.YOLO_MODEL_PROCTOR)
            self._names_p = self._yolo_p.names
            self._warmup(self._yolo_p)
            print(f"  [YOLO] Proctoring model ready on {_DEVICE}.")

            print(f"  [YOLO] Loading COCO model (person detection) …")
            self._yolo_c = self._load(config.YOLO_MODEL_COCO)
            self._warmup(self._yolo_c)
            print(f"  [YOLO] COCO model ready on {_DEVICE}.")

            self._ready = True
            self._run()
        except Exception as e:
            print(f"  [YOLO] Load failed: {e}")
            self._ready = False

    def _run(self):
        while self._running:
            try:
                frame = self._q.get(timeout=0.5)
            except Empty:
                continue

            det = Detection()
            h, w = frame.shape[:2]

            # ── Model A: fine-tuned proctoring model ──────────
            try:
                preds = self._yolo_p.predict(
                    frame,
                    conf    = 0.25,
                    classes = config.YOLO_CLASSES_PROCTOR,
                    imgsz   = (h, w),
                    half    = _CUDA,
                    verbose = False,
                    device  = _DEVICE,
                )
                for r in preds:
                    for box in r.boxes:
                        cls  = int(box.cls[0])
                        name = self._names_p.get(cls, f"class_{cls}")
                        conf = float(box.conf[0])

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        if (x2-x1) < config.YOLO_MIN_PX or (y2-y1) < config.YOLO_MIN_PX:
                            continue

                        req = config.YOLO_CONFS_PROCTOR.get(name, config.YOLO_CONF_DEFAULT)
                        if conf < req:
                            continue

                        det.boxes.append((x1, y1, x2, y2, name, conf))

                        if name in config.YOLO_FLAG_ITEMS:
                            det.items.append(name)
                        else:
                            # Unknown object — save one crop for the PDF report
                            if det.unknown_capture is None:
                                crop = frame[max(0,y1):min(h,y2), max(0,x1):min(w,x2)]
                                if crop.size > 0:
                                    det.unknown_capture = crop.copy()

            except Exception as e:
                print(f"  [YOLO-P] Inference error: {e}")

            # ── Model B: COCO — person count only ────────────
            try:
                preds_c = self._yolo_c.predict(
                    frame,
                    conf    = config.YOLO_CONF_PERSON,
                    classes = config.YOLO_CLASSES_COCO,
                    imgsz   = (h, w),
                    half    = _CUDA,
                    verbose = False,
                    device  = _DEVICE,
                )
                for r in preds_c:
                    for box in r.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        if (x2-x1) < config.YOLO_MIN_PX or (y2-y1) < config.YOLO_MIN_PX:
                            continue
                        det.person_count += 1

            except Exception as e:
                print(f"  [YOLO-C] Inference error: {e}")

            with self._lock:
                self._latest = det

    def draw(self, frame, det: Detection):
        out = frame.copy()
        for (x1, y1, x2, y2, name, conf) in det.boxes:
            col = (0, 0, 220) if name in config.YOLO_FLAG_ITEMS else (150, 150, 150)
            cv2.rectangle(out, (x1,y1), (x2,y2), col, 2)
            cv2.putText(out, f"{name} {conf:.2f}", (x1, y1-8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1)
        return out
