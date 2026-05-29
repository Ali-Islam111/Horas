# ==============================================================
# detectors/object_detector.py  —  Dual-model YOLO (V10.0)
# ==============================================================
#
# Architecture change vs V9.0:
#
#   V9.0 — single model (fine-tuned) handled EVERYTHING:
#     - Items  (phone, book, earphone …)
#     - Person count
#     This is wrong: the fine-tuned model has no "person" class.
#     Person detection was silently broken.
#
#   V10.0 — two models, one shared Detection output:
#     ┌─────────────────────────┬──────────────────────────────┐
#     │ fine-tuned (YOLO_MODEL) │ items only                   │
#     │   classes 0-6           │ unknown class → unknown_frame│
#     ├─────────────────────────┼──────────────────────────────┤
#     │ COCO YOLOv8n            │ person-count only            │
#     │ (YOLO_COCO_MODEL)       │ class 0 = person             │
#     └─────────────────────────┴──────────────────────────────┘
#
#   Both models share a single queue and produce a single Detection.
#   The fine-tuned thread updates det.items + det.boxes.
#   The COCO thread updates det.person_count.
#   A merge lock prevents torn reads.
#
# Unknown class handling:
#   If the fine-tuned model fires on a class not in YOLO_FLAG_ITEMS
#   and not in YOLO_CONFS, it is considered "unknown".
#   One frame is saved to det.unknown_frame. No alert is raised —
#   the caller (main.py / proctoring_session.py) decides what to do
#   with it (wire to PDF Section 5.5).
#
# Retained from V9.0:
#   - Lazy model loading on background thread (non-blocking start)
#   - uint8 frame guard (no float cast before YOLO)
#   - Warmup dummy
#   - Size and aspect-ratio filters
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
    __slots__ = ("person_count", "items", "boxes", "unknown_frame", "ts")
    def __init__(self):
        self.person_count  = 0
        self.items:  list  = []
        self.boxes:  list  = []
        self.unknown_frame = None   # np.ndarray | None
        self.ts = time.time()


class ObjectDetector:
    """
    Dual-model YOLO detector with lazy loading.

    Fine-tuned model  → prohibited items + unknown class capture
    COCO YOLOv8n      → person count only

    Both threads write into a single shared Detection via _merge_lock.
    start() is non-blocking; models load on daemon threads.
    """

    def __init__(self):
        self._q_item     = Queue(maxsize=2)   # frames for fine-tuned model
        self._q_coco     = Queue(maxsize=2)   # frames for COCO model
        self._latest     = Detection()
        self._lock       = threading.Lock()   # protects self._latest reads
        self._merge_lock = threading.Lock()   # prevents torn writes during merge
        self._running    = False
        self._t_item     = None
        self._t_coco     = None
        self._yolo_ft    = None   # fine-tuned model instance
        self._yolo_coco  = None   # COCO model instance
        self._names_ft   = {}
        self._ft_ok      = False
        self._coco_ok    = False

    def start(self):
        """Non-blocking. Both models load on daemon threads."""
        self._running = True
        self._t_item  = threading.Thread(
            target=self._load_and_run_ft,   daemon=True, name="yolo-finetuned")
        self._t_coco  = threading.Thread(
            target=self._load_and_run_coco, daemon=True, name="yolo-coco")
        self._t_item.start()
        self._t_coco.start()

    def stop(self):
        self._running = False
        for t in [self._t_item, self._t_coco]:
            if t: t.join(timeout=2.0)

    def enqueue(self, frame):
        """
        Push a uint8 BGR frame to both model queues.
        Silently drops if queue is full or model not ready.
        """
        self._enq(self._q_item, frame, self._ft_ok)
        self._enq(self._q_coco, frame, self._coco_ok)

    @staticmethod
    def _enq(q, frame, ready):
        if not ready:
            return
        if q.full():
            try: q.get_nowait()
            except Empty: pass
        q.put(frame)

    @property
    def result(self) -> Detection:
        with self._lock:
            return self._latest

    # ── Fine-tuned model thread ───────────────────────────────

    def _load_and_run_ft(self):
        if self._load_model_ft():
            self._run_ft()

    def _load_model_ft(self) -> bool:
        try:
            from ultralytics import YOLO
            yolo = YOLO(config.YOLO_MODEL)
            yolo.to(_DEVICE)
            dummy = np.zeros(
                (config.YOLO_INPUT_H, config.YOLO_INPUT_W, 3), dtype=np.uint8)
            try:
                yolo.predict(dummy,
                             imgsz=(config.YOLO_INPUT_H, config.YOLO_INPUT_W),
                             verbose=False, half=_CUDA)
                print("  [YOLO-FT] Warmup complete.")
            except Exception as e:
                print(f"  [YOLO-FT] Warmup error (ignored): {e}")
            self._yolo_ft  = yolo
            self._names_ft = yolo.names
            self._ft_ok    = True
            print(f"  [YOLO-FT] Loaded '{config.YOLO_MODEL}' on {_DEVICE}")
            return True
        except Exception as e:
            print(f"  [YOLO-FT] Not available: {e}")
            return False

    def _run_ft(self):
        while self._running:
            try: frame = self._q_item.get(timeout=0.5)
            except Empty: continue

            items         = []
            boxes         = []
            unknown_frame = None
            h, w = frame.shape[:2]

            try:
                preds = self._yolo_ft.predict(
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
                        name = self._names_ft.get(cls, str(cls))
                        conf = float(box.conf[0])

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        bw, bh = x2 - x1, y2 - y1
                        if bw < config.YOLO_MIN_PX or bh < config.YOLO_MIN_PX:
                            continue
                        if bw <= 0 or bh <= 0:
                            continue

                        # Aspect-ratio filters (retained from V9.0)
                        ratio = bh / bw
                        if name == "cell phone" and 0.8 < ratio < 1.2:
                            continue
                        if name == "book" and (ratio < 0.25 or ratio > 2.5):
                            continue

                        # Unknown class: not in known conf map AND not a flag item
                        if name not in config.YOLO_CONFS and \
                           name not in config.YOLO_FLAG_ITEMS:
                            if unknown_frame is None:
                                unknown_frame = frame.copy()
                            continue   # no alert, no box

                        req_conf = config.YOLO_CONFS.get(
                            name, config.YOLO_CONF_DEFAULT)
                        if conf < req_conf:
                            continue

                        boxes.append((x1, y1, x2, y2, name, conf))
                        if name in config.YOLO_FLAG_ITEMS:
                            items.append(name)

            except Exception as e:
                print(f"  [YOLO-FT] Inference error: {e}")

            # Merge into shared Detection (items + boxes side only)
            with self._merge_lock:
                with self._lock:
                    prev = self._latest
                    new  = Detection()
                    new.person_count  = prev.person_count   # keep COCO value
                    new.items         = items
                    new.boxes         = boxes
                    new.unknown_frame = unknown_frame
                    new.ts            = time.time()
                    self._latest = new

    # ── COCO model thread (person count only) ─────────────────

    def _load_and_run_coco(self):
        if self._load_model_coco():
            self._run_coco()

    def _load_model_coco(self) -> bool:
        try:
            from ultralytics import YOLO
            yolo = YOLO(config.YOLO_COCO_MODEL)
            yolo.to(_DEVICE)
            dummy = np.zeros(
                (config.YOLO_INPUT_H, config.YOLO_INPUT_W, 3), dtype=np.uint8)
            try:
                yolo.predict(dummy,
                             imgsz=(config.YOLO_INPUT_H, config.YOLO_INPUT_W),
                             classes=[0],
                             verbose=False, half=_CUDA)
                print("  [YOLO-COCO] Warmup complete.")
            except Exception as e:
                print(f"  [YOLO-COCO] Warmup error (ignored): {e}")
            self._yolo_coco = yolo
            self._coco_ok   = True
            print(f"  [YOLO-COCO] Loaded '{config.YOLO_COCO_MODEL}' on {_DEVICE}")
            return True
        except Exception as e:
            print(f"  [YOLO-COCO] Not available: {e}")
            return False

    def _run_coco(self):
        while self._running:
            try: frame = self._q_coco.get(timeout=0.5)
            except Empty: continue

            person_count = 0
            h, w = frame.shape[:2]
            try:
                preds = self._yolo_coco.predict(
                    frame,
                    conf    = 0.40,
                    classes = [0],   # COCO class 0 = person
                    imgsz   = (h, w),
                    half    = _CUDA,
                    verbose = False,
                    device  = _DEVICE,
                )
                for r in preds:
                    for box in r.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        bw, bh = x2 - x1, y2 - y1
                        if bw < config.YOLO_MIN_PX or bh < config.YOLO_MIN_PX:
                            continue
                        person_count += 1
            except Exception as e:
                print(f"  [YOLO-COCO] Inference error: {e}")

            # Merge into shared Detection (person_count side only)
            with self._merge_lock:
                with self._lock:
                    prev = self._latest
                    new  = Detection()
                    new.person_count  = person_count
                    new.items         = prev.items            # keep FT value
                    new.boxes         = prev.boxes            # keep FT value
                    new.unknown_frame = prev.unknown_frame    # keep FT value
                    new.ts            = time.time()
                    self._latest = new

    # ── Draw helper ───────────────────────────────────────────

    def draw(self, frame, det: Detection):
        out = frame.copy()
        for (x1, y1, x2, y2, name, conf) in det.boxes:
            cv2.rectangle(out, (x1, y1), (x2, y2), (0, 0, 220), 2)
            cv2.putText(out, f"{name} {conf:.2f}", (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 220), 1)
        return out
