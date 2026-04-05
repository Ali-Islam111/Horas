# ==============================================================
# proctoring_session.py  —  Public API for the backend team (V9.0)
# ==============================================================
#
# This is the ONLY file your backend needs to touch.
# Import it, create sessions, start them, stop them.
# All AI internals are invisible.
#
# FIXES vs V8.0:
#
#   FIX A — Startup time (the slow import problem)
#     V8.0 still imported offline_trainer at module level, which imported
#     tensorflow + sklearn a second time (after anomaly.py already imported them).
#     V9.0: offline_trainer is imported lazily inside _retrain_in_background(),
#     only when actually needed (after session ends). Import is now instant.
#     Combined with the lazy YOLO + lazy TF fixes in object_detector.py and
#     anomaly.py, the import goes from ~8-20 seconds down to <1 second.
#
#   FIX B — Per-session log file
#     V8.0 inherited a single shared session.log for all sessions.
#     V9.0: each session writes to logs/<SESSION_ID>.log, so 100 concurrent
#     sessions never interleave their log lines.
#
#   FIX C — get_status() reference leak
#     V8.0: self._head/_gaze/_lip assigned directly — the background
#     thread could mutate these dicts while the backend was reading them.
#     V9.0: assigned with .copy() so get_status() always returns snapshots.
#
#   FIX D — stop() shutdown status
#     V8.0: stop() returned the same dict whether the session ended cleanly
#     or the background thread had crashed silently.
#     V9.0: adds "shutdown_clean": bool to the result. True = normal stop(),
#     False = thread died on its own (crash/exception).
#
#   FIX E — Session ID collision resistance
#     V8.0: 8 hex chars from uuid4 = 4 billion combinations, ~0.001% collision
#     at 1,000 concurrent sessions. Fine in practice, but trivial to improve.
#     V9.0: 12 chars (first 12 of uuid4 hex, no hyphens) = 281 trillion combos.
#
# Retained from V8.0:
#   FIX 1 — Lip processing order
#   FIX 2 — Per-session FaceMesh
#   FIX 3 — Per-session AlertHook
#   FIX 4 — Identity worker lock contention
#   FIX 5 — Enrollment failure alert
#   FIX 6 — Dropped frame counter
#   FIX 7 — ANOMALY_EVERY rate-gating
# ==============================================================

import cv2, time, uuid, threading, queue, os, numpy as np
from datetime import datetime

import config
from core import EventLogger, AttentionScore, AlertHook
from detectors.head_pose         import HeadPoseDetector
from detectors.face_signals      import GazeDetector, LipMovementDetector
from detectors.anomaly           import IForestDetector, LSTMAutoencoder, build_vector
from detectors.object_detector   import ObjectDetector
from detectors.audio             import MicMonitor
from detectors.dataset_collector import DatasetCollector
from reports.pdf_report          import generate



# FIX A (V9.0): offline_trainer imported lazily inside the function that
# needs it — not at module level. This removes the duplicate TF + sklearn
# import that was adding 3-8 seconds to every server start.
_TRAINER_OK = None  # None = not yet checked; True/False after first check

try:
    from detectors.identity import IdentityVerifier
except Exception:
    class IdentityVerifier:
        def __init__(self, sid):
            self.enrolled = False; self.reference_image = None; self.last_result = {}
        def enroll(self, frames): return False
        def verify(self, frame):  return {"verified": True, "distance": 0.0}


# ── Per-session log directory ─────────────────────────────────
_LOGS_DIR = os.path.join(config.BASE_DIR, "logs")
os.makedirs(_LOGS_DIR, exist_ok=True)


def _retrain_in_background():
    """
    FIX A (V9.0): offline_trainer imported HERE, not at module level.
    This is the only place it's needed. The import only happens once
    per session end, on a daemon thread — never blocking the server.
    """
    global _TRAINER_OK
    try:
        from offline_trainer import train_iforest, train_lstm
        _TRAINER_OK = True
    except ImportError:
        _TRAINER_OK = False
        return
    print("\n  [AutoTrain] Session ended — checking if retraining is needed …")
    try:
        ok_if   = train_iforest()
        ok_lstm = train_lstm()
        if ok_if or ok_lstm:
            print("  [AutoTrain] Models updated. Will load on next session start.")
        else:
            print("  [AutoTrain] Not enough data yet — collect more sessions first.")
    except Exception as e:
        print(f"  [AutoTrain] Retraining error (non-fatal): {e}")


def _get_roi(frame, bbox, pad):
    if bbox is None:
        return frame, 0, 0
    x1, y1, x2, y2 = bbox
    h, w = frame.shape[:2]
    rx1 = max(0, x1 - pad)
    ry1 = max(0, y1 - pad)
    rx2 = min(w, x2 + pad)
    ry2 = min(h, y2 + pad)
    crop = frame[ry1:ry2, rx1:rx2]
    if crop.size == 0:
        return frame, 0, 0
    return crop, rx1, ry1


class ProctoringSession:
    """
    One instance = one student's exam session.

    Quick start:
        session = ProctoringSession(
            student_id   = "S-1042",
            student_name = "Ahmed Hassan",
            on_alert     = lambda alert: socketio.emit("alert", alert),
        )
        session.start()   # non-blocking

    See API_CONTRACT.md for the full reference.
    """

    def __init__(self,
                 student_id:   str,
                 student_name: str      = "Student",
                 on_alert:     callable = None,
                 on_ready:     callable = None,
                 on_failed:    callable = None,
                 session_id:   str      = None):
        self.student_id   = student_id
        self.student_name = student_name
        # FIX E (V9.0): 12-char ID — 281 trillion combinations vs 4 billion
        self.session_id   = (session_id or uuid.uuid4().hex[:12]).upper()
        self._on_alert    = on_alert

        self._start_time     = None
        self._end_time       = None
        self._state          = "idle"
        self._lock           = threading.Lock()
        self._thread         = None
        self._stop_event     = threading.Event()
        self._thread_crashed = False      # FIX D
        self.frame_queue     = queue.Queue(maxsize=30)

        self._attention      = 100.0
        self._is_alert       = False
        self._fps            = 0.0
        # FIX C (V9.0): stored as copies, never as live references
        self._head           = {}
        self._gaze           = {}
        self._lip            = {}

        self._if_res         = {}
        self._lstm_res       = {}
        self._last_frame     = None
        self._dropped_frames = 0

        self._pdf_path       = None
        self._events         = []

        # FIX B (V9.0): per-session log path
        self._log_path = os.path.join(_LOGS_DIR, f"{self.session_id}.log")

    # ── Public API ───────────────────────────────────────────

    def push_frame(self, frame_bytes: bytes):
        """Push a JPEG frame from the browser. Thread-safe."""
        if self.frame_queue.full():
            with self._lock:
                self._dropped_frames += 1
        else:
            self.frame_queue.put(frame_bytes)

    def start(self):
        """Start the session. Non-blocking. Raises if called twice."""
        if self._state != "idle":
            raise RuntimeError(f"Session {self.session_id} already started.")
        self._start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._state      = "enrolling"
        self._thread     = threading.Thread(target=self._run_safe, daemon=True,
                                            name=f"proctor-{self.session_id}")
        self._thread.start()

    def stop(self) -> dict:
        """
        Signal stop. Blocks up to 10 seconds for clean shutdown.
        Returns the Stop Result dict (see API_CONTRACT.md).
        FIX D (V9.0): result includes 'shutdown_clean' bool.
        """
        self._stop_event.set()
        if self._thread:
            # changed to 60 so it won't trigger an edge case where the AI thread finishes after `pdf_path` is written as None in DB.
            self._thread.join(timeout=60.0)             
        return self._build_result()

    def get_status(self) -> dict:
        """Thread-safe live snapshot. Call as often as needed."""
        with self._lock:
            return {
                "session_id":     self.session_id,
                "student_id":     self.student_id,
                "student_name":   self.student_name,
                "state":          self._state,
                "attention":      round(self._attention, 1),
                "is_alert":       self._is_alert,
                "fps":            round(self._fps, 1),
                "event_count":    len(self._events),
                "dropped_frames": self._dropped_frames,
                "detectors": {
                    # FIX C: .copy() on each dict — safe snapshots
                    "head":  dict(self._head),
                    "gaze":  dict(self._gaze),
                    "lip":   dict(self._lip),
                    "iforest": {
                        "trained": self._if_res.get("trained", False),
                        "score":   self._if_res.get("score"),
                        "anomaly": self._if_res.get("anomaly", False),
                    },
                    "lstm": {
                        "trained": self._lstm_res.get("trained", False),
                        "mse":     self._lstm_res.get("mse"),
                        "anomaly": self._lstm_res.get("anomaly", False),
                    },
                },
            }

    def get_events(self, since: str = None) -> list:
        """All logged events, optionally filtered by timestamp."""
        with self._lock:
            events = list(self._events)
        if since:
            events = [e for e in events if e["timestamp"] >= since]
        return events

    def get_frame_jpeg(self) -> bytes | None:
        """Latest annotated frame as JPEG bytes, or None."""
        with self._lock:
            return self._last_frame

    @property
    def state(self) -> str:
        """Quick state check: idle|enrolling|calibrating|active|stopped"""
        return self._state

    # ── Internal ─────────────────────────────────────────────

    def _run_safe(self):
        """Wrapper that catches unhandled exceptions from _run()."""
        try:
            self._run()
        except Exception as e:
            print(f"[Session {self.session_id}] FATAL: unhandled exception: {e}")
            import traceback; traceback.print_exc()
            self._thread_crashed = True
            self._state = "stopped"

    def _run(self):
        # FIX 3: per-session AlertHook — no shared global
        hook = AlertHook()
        if self._on_alert:
            hook.register(self._make_alert_handler())

        # FIX B: per-session log file
        log      = EventLogger(alert_hook=hook, log_path=self._log_path)
        attn     = AttentionScore()
        verifier = IdentityVerifier(self.session_id)
        iforest  = IForestDetector()
        lstm     = LSTMAutoencoder()
        yolo     = ObjectDetector()
        collector= DatasetCollector(self.session_id)

        fw = config.FRAME_W
        fh = config.FRAME_H
        yolo_w, yolo_h = config.YOLO_INPUT_W, config.YOLO_INPUT_H

        head_det  = HeadPoseDetector(fw, fh)
        gaze_det  = GazeDetector()
        lip_det   = LipMovementDetector()

        # FIX 2: per-session FaceMesh — no shared global lock
        try:
            import mediapipe as mp
            _mp_mesh = mp.solutions.face_mesh
            _MP_OK   = True
        except ImportError:
            _MP_OK = False

        if not _MP_OK:
            print(f"[Session {self.session_id}] MediaPipe unavailable — stopping.")
            self._state = "stopped"
            return

        face_mesh = _mp_mesh.FaceMesh(
            static_image_mode        = False,
            max_num_faces            = 1,
            refine_landmarks         = True,
            min_detection_confidence = 0.65,
            min_tracking_confidence  = 0.65,
        )

        self._state = "enrolling"
        enrolled    = self._do_enrollment(verifier, face_mesh, fh, fw)
        if not enrolled:
            print(f"[Session {self.session_id}] Enrollment failed — identity unverified.")

        yolo.start()
        id_worker = _IdentityWorker(verifier)

        def _audio_cb(display: str, conf: float, transcript: str = ""):
            log.log("AUDIO", display,
                    details=f"confidence={conf:.2f}" +
                            (f" | transcript=\"{transcript}\"" if transcript else ""),
                    cooldown=config.AUDIO_COOLDOWN,
                    severity=config.SEV.get("whisper", 2),
                    attention=attn)

        mic = MicMonitor(_audio_cb)
        mic.start()

        head  = dict(head_away=False, direction="CENTER",
                     yaw=0, pitch=0, roll=0, yaw_dev=0, pitch_dev=0, roll_dev=0)
        gaze  = dict(gaze_away=False, direction="CENTER",
                     avg_h=0.5, avg_v=0.5, left_h=0.5, right_h=0.5)
        lip   = dict(lar=0.0, lip_open=False, lip_moving=False)
        if_res   = {"trained": False, "score": None, "anomaly": False}
        lstm_res = {"trained": False, "mse":   None, "anomaly": False}

        face_bbox      = None
        lms_cached     = None
        head_away_prev = False
        face_absent_since = None   # timestamp when face first disappeared
        last_id_check  = 0.0
        fres           = None
        frame_n        = 0
        fps_t0         = time.perf_counter()
        fps_count      = 0
        fps_display    = 0.0
        _roi_pad       = 60

        self._state = "calibrating"

        while not self._stop_event.is_set():
            try:
                frame_bytes = self.frame_queue.get(timeout=1.0)
            except queue.Empty:
                if not enrolled:
                    log.log("IDENTITY", "Enrollment failed — identity unverified",
                            details="Student did not complete face enrollment",
                            cooldown=config.COOLDOWN_NO_ENROLLMENT,
                            severity=config.SEV["no_enrollment"],
                            attention=attn)
                continue

            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            frame   = cv2.flip(frame, 1)
            frame_n += 1

            fps_count += 1
            now = time.perf_counter()
            if now - fps_t0 >= 0.5:
                fps_display = fps_count / (now - fps_t0)
                fps_count   = 0
                fps_t0      = now

            is_alert = False
            run_mp   = (frame_n % config.MEDIAPIPE_EVERY == 0)

            if run_mp:
                roi, rx, ry = _get_roi(frame, face_bbox, _roi_pad)
                roi_rgb     = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
                fres        = face_mesh.process(roi_rgb)
                if fres and fres.multi_face_landmarks:
                    roi_h, roi_w = roi.shape[:2]
                    for lm in fres.multi_face_landmarks[0].landmark:
                        lm.x = (lm.x * roi_w + rx) / fw
                        lm.y = (lm.y * roi_h + ry) / fh

            # ── Calibration ───────────────────────────────────
            if not head_det.calibrated:
                if run_mp and fres and fres.multi_face_landmarks:
                    lms = fres.multi_face_landmarks[0].landmark
                    head_det.calibrate_tick(lms)
                    lh = GazeDetector._hr(lms, config.EYE_L_OUTER, config.EYE_L_INNER, config.IRIS_LEFT)
                    rh = GazeDetector._hr(lms, config.EYE_R_OUTER, config.EYE_R_INNER, config.IRIS_RIGHT)
                    lv = GazeDetector._vr(lms, config.EYE_L_TOP,   config.EYE_L_BOT,   config.IRIS_LEFT)
                    rv = GazeDetector._vr(lms, config.EYE_R_TOP,   config.EYE_R_BOT,   config.IRIS_RIGHT)
                    gaze_det.calibrate_tick(
                        avg_h=np.clip((lh + rh) / 2, 0, 1),
                        avg_v=np.clip((lv + rv) / 2, 0, 1),
                    )
                self._push_frame(frame, attn, fps_display, calibrating=True)
                continue

            if self._state == "calibrating":
                self._state = "active"
                print(f"[Session {self.session_id}] Calibration done — proctoring active.")

            # ── Active proctoring ─────────────────────────────
            if run_mp and fres and fres.multi_face_landmarks:
                lms_cached = fres.multi_face_landmarks[0].landmark

            if lms_cached is not None:
                face_absent_since = None   # ← add this line
                lms   = lms_cached
                lm_xs = np.array([lm.x for lm in lms]) * fw
                lm_ys = np.array([lm.y for lm in lms]) * fh
                face_bbox = (int(lm_xs.min()), int(lm_ys.min()),
                             int(lm_xs.max()), int(lm_ys.max()))

                head = head_det.process(lms)
                if head["head_away"]:
                    is_alert = True
                    if not head_away_prev:
                        log.log("EYE/HEAD", "Student looked away",
                                details=(f"direction={head['direction']}  "
                                         f"yaw={head['yaw_dev']:+.1f}°  "
                                         f"pitch={head['pitch_dev']:+.1f}°"),
                                frame=frame,
                                cooldown=config.COOLDOWN_HEAD_AWAY,
                                severity=config.SEV["head_away"], attention=attn)
                    head_away_prev = True
                else:
                    head_away_prev = False

                gaze = gaze_det.process(lms)
                if gaze["gaze_away"]:
                    is_alert = True
                    log.log("GAZE", "Suspicious gaze direction",
                            details=f"direction={gaze['direction']}  h={gaze['avg_h']:.2f}",
                            cooldown=config.COOLDOWN_GAZE,
                            severity=config.SEV["gaze_away"], attention=attn)

                # FIX 1: process first, then check
                lip = lip_det.process(lms, fw, fh)
                if lip["lip_moving"]:
                    is_alert = True
                    log.log("LIP", "Lip movement detected",
                            details=f"lar={lip['lar']:.3f}",
                            cooldown=config.COOLDOWN_LIP,
                            severity=config.SEV["lip_moving"], attention=attn)
            else:
                face_bbox  = None
                is_alert   = True
                now_absent = time.time()

                if face_absent_since is None:
                    face_absent_since = now_absent

                absent_secs = now_absent - face_absent_since

                if absent_secs >= config.FACE_ABSENT_CRIT_SEC:
                    log.log("EYE/HEAD", "Student has left the exam area",
                            details=f"Face absent for {int(absent_secs)}s",
                            frame=frame,
                            cooldown=60.0,
                            severity=config.SEV["face_absent_crit"], attention=attn)
                elif absent_secs >= config.FACE_ABSENT_GONE_SEC:
                    log.log("EYE/HEAD", "Student may have left the exam",
                            details=f"Face absent for {int(absent_secs)}s",
                            frame=frame,
                            cooldown=30.0,
                            severity=config.SEV["face_absent_gone"], attention=attn)
                else:
                    log.log("EYE/HEAD", "Face not visible",
                            details=f"Face absent for {int(absent_secs)}s",
                            cooldown=config.COOLDOWN_NO_FACE,
                            severity=config.SEV["no_face"], attention=attn)

            # ── YOLO ─────────────────────────────────────────
            if frame_n % config.YOLO_EVERY == 0:
                yolo.enqueue(cv2.resize(frame, (yolo_w, yolo_h)))
            det = yolo.result
            if det.person_count > 1:
                is_alert = True
                log.log("YOLO", "Multiple people detected",
                        details=f"count={det.person_count}",
                        frame=frame,
                        cooldown=config.COOLDOWN_MULTI_PERSON,
                        severity=config.SEV["multi_person"], attention=attn)
            for item in set(det.items):
                is_alert = True
                log.log("YOLO", f"{item.title()} detected",
                        details="Prohibited item in frame",
                        frame=frame,
                        cooldown=config.COOLDOWN_YOLO_ITEM,
                        severity=config.SEV["phone" if "phone" in item.lower() else "book"],
                        attention=attn)
            # Unknown object — one capture per cooldown period, low severity, saved for report
            if det.unknown_capture is not None:
                log.log("UNKNOWN", "Unknown object detected",
                        details="Object not in prohibited list — logged for review",
                        frame=frame,
                        cooldown=config.COOLDOWN_UNKNOWN_OBJ,
                        severity=config.SEV["unknown_object"], attention=attn)

            # ── Identity ──────────────────────────────────────
            now_t = time.time()
            if not enrolled:
                log.log("IDENTITY", "Enrollment failed — identity unverified",
                        details="Student did not complete face enrollment",
                        cooldown=config.COOLDOWN_NO_ENROLLMENT,
                        severity=config.SEV["no_enrollment"], attention=attn)
            elif now_t - last_id_check >= config.ID_CHECK_EVERY:
                last_id_check = now_t
                id_worker.request(frame)

            id_res = id_worker.result
            if id_res and not id_res.get("verified", True):
                is_alert = True
                log.log("IDENTITY", "Identity mismatch — possible impersonation",
                        details=f"cosine_distance={id_res['distance']:.4f}",
                        frame=frame,
                        cooldown=config.COOLDOWN_IDENTITY,
                        severity=config.SEV["identity"], attention=attn)

            # FIX 7: rate-gated anomaly updates
            if frame_n % config.ANOMALY_EVERY == 0:
                vec      = build_vector(head, gaze, lip)
                if_res   = iforest.update(vec)
                lstm_res = lstm.update(vec)
            if if_res.get("anomaly"):
                is_alert = True
                log.log("ANOMALY", "Behavioural anomaly (IForest)",
                        details=f"score={if_res['score']:.4f}",
                        cooldown=config.COOLDOWN_ANOMALY,
                        severity=config.SEV["iforest"], attention=attn)
            if lstm_res.get("anomaly"):
                is_alert = True
                log.log("ANOMALY", "Temporal anomaly (LSTM)",
                        details=f"mse={lstm_res['mse']:.5f}",
                        cooldown=config.COOLDOWN_ANOMALY,
                        severity=config.SEV["lstm"], attention=attn)

            if not is_alert:
                attn.recover()
            if attn.tick():
                log.log("SYSTEM", "Sustained low attention score",
                        details=f"score={attn.value:.1f}",
                        cooldown=config.COOLDOWN_ATTN_SYSTEM, severity=0)

            # ── Dataset snapshot ──────────────────────────────
            _active = []
            if lms_cached is not None:
                if head.get("head_away"):     _active.append("EYE/HEAD")
                if gaze.get("gaze_away"):     _active.append("GAZE")
                if lip.get("lip_moving"):     _active.append("LIP")
            if det.person_count > 1:          _active.append("YOLO_MULTI")
            if if_res.get("anomaly"):         _active.append("ANOMALY")
            if lstm_res.get("anomaly"):       _active.append("ANOMALY")
            collector.tick(frame, {
                "head": head, "gaze": gaze, "lip": lip,
                "attention": attn.value,
                "if_score": if_res.get("score"), "lstm_mse": lstm_res.get("mse"),
            }, _active)

            # FIX C: push COPIES — no reference leak
            with self._lock:
                self._attention = attn.value
                self._is_alert  = is_alert
                self._fps       = fps_display
                self._head      = dict(head)
                self._gaze      = dict(gaze)
                self._lip       = dict(lip)
                self._if_res    = dict(if_res)
                self._lstm_res  = dict(lstm_res)
                self._events    = list(log.events)

            self._push_frame(frame, attn, fps_display,
                             is_alert=is_alert, calibrating=False)

        # ── Shutdown ─────────────────────────────────────────
        face_mesh.close()
        yolo.stop()
        id_worker.stop()
        mic.stop()
        collector.summary()
        self._end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._state    = "stopped"

        threading.Thread(
            target=_retrain_in_background,
            daemon=True,
            name=f"retrain-{self.session_id}",
        ).start()

        with self._lock:
            self._events = list(log.events)
            final_head   = dict(head)
            final_gaze   = dict(gaze)
            final_lip    = dict(lip)
            final_if     = dict(if_res)
            final_lstm   = dict(lstm_res)

        if log.events:
            self._pdf_path = generate(
                events            = log.events,
                session_id        = self.session_id,
                student_name      = self.student_name,
                start_time        = self._start_time,
                end_time          = self._end_time,
                reference_image   = verifier.reference_image,
                attention_history = list(attn.history),
                detector_stats    = {
                    "Head Pose":   {k: final_head.get(k)  for k in ["yaw_dev","pitch_dev","roll_dev","direction"]},
                    "Gaze":        {k: final_gaze.get(k)  for k in ["avg_h","avg_v","direction"]},
                    "Lip":         {k: final_lip.get(k)   for k in ["lar","lip_moving"]},
                    "IForest":     {k: final_if.get(k)    for k in ["trained","score","anomaly"]},
                    "LSTM AE":     {k: final_lstm.get(k)  for k in ["trained","mse","anomaly"]},
                    "Identity":    verifier.last_result or {},
                },
            )

    def _make_alert_handler(self):
        def _handle(source: str, event_type: str, severity: int):
            with self._lock:
                latest = self._events[-1] if self._events else {}
            try:
                self._on_alert({
                    "session_id":  self.session_id,
                    "student_id":  self.student_id,
                    "source":      source,
                    "event_type":  event_type,
                    "severity":    severity,
                    "timestamp":   latest.get("timestamp", ""),
                    "details":     latest.get("details", ""),
                    "screenshot":  latest.get("screenshot", ""),
                })
            except Exception as e:
                print(f"[Session {self.session_id}] on_alert callback error: {e}")
        return _handle

    def _push_frame(self, frame, attn, fps, is_alert=False, calibrating=False):
        try:
            display = frame.copy()
            pct = int(attn.value)
            col = (0, 200, 80) if pct > 70 else (0, 180, 255) if pct > 45 else (0, 0, 210)
            h, w = display.shape[:2]
            cv2.rectangle(display, (8, 10), (292, 28), (40, 40, 50), -1)
            cv2.rectangle(display, (8, 10), (8 + int(284 * pct / 100), 28), col, -1)
            cv2.putText(display, f"ATTENTION {pct}%  |  {fps:.0f} FPS",
                        (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.48, col, 1)
            if is_alert:
                cv2.rectangle(display, (0, h - 36), (w, h), (0, 0, 185), -1)
                cv2.putText(display, "ALERT", (w // 2 - 30, h - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            if calibrating:
                cv2.putText(display, "CALIBRATING — look straight ahead",
                            (10, h // 2), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (0, 220, 60), 2)
            _, buf = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 70])
            with self._lock:
                self._last_frame = buf.tobytes()
        except Exception:
            pass

    def _do_enrollment(self, verifier, face_mesh, fh, fw) -> bool:
        """
        Guided multi-angle enrollment — V10.0.

        Asks the student to face three angles (frontal, left, right).
        Collects ID_REF_FRAMES frames per angle = 3 × ID_REF_FRAMES total.
        Passes all frames to verifier.enroll() which stores all embeddings.
        Verification later uses best-match (min distance) across all angles.
        """
        n_per_angle = config.ID_REF_FRAMES   # e.g. 15 frames per angle
        angles = [
            ("Look straight at the camera",  "frontal"),
            ("Turn slightly to your LEFT",    "left"),
            ("Turn slightly to your RIGHT",   "right"),
        ]
        all_frames = []
        timeout_per_angle = 20  # seconds max per angle

        for prompt, angle_name in angles:
            captured = 0
            deadline = time.time() + timeout_per_angle
            while (captured < n_per_angle
                   and time.time() < deadline
                   and not self._stop_event.is_set()):
                try:
                    frame_bytes = self.frame_queue.get(timeout=1.0)
                except queue.Empty:
                    continue
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    continue
                frame = cv2.flip(frame, 1)
                rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                fres  = face_mesh.process(rgb)
                if fres and fres.multi_face_landmarks:
                    all_frames.append(frame.copy())
                    captured += 1
                    # Show enrollment prompt on frame
                    display = frame.copy()
                    h, w = display.shape[:2]
                    cv2.rectangle(display, (0, h-70), (w, h), (30, 30, 30), -1)
                    cv2.putText(display, f"ENROLLMENT: {prompt}",
                                (10, h-42), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 220, 60), 2)
                    cv2.putText(display,
                                f"Angle {angles.index((prompt, angle_name))+1}/3  "
                                f"({captured}/{n_per_angle} captured)",
                                (10, h-14), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
                    _, buf = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    with self._lock:
                        self._last_frame = buf.tobytes()
                    time.sleep(0.25)

        if not all_frames:
            return False
        return verifier.enroll(all_frames)

    def _build_result(self) -> dict:
        with self._lock:
            return {
                "session_id":     self.session_id,
                "student_id":     self.student_id,
                "student_name":   self.student_name,
                "start_time":     self._start_time,
                "end_time":       self._end_time,
                "state":          self._state,
                "event_count":    len(self._events),
                "events":         list(self._events),
                "pdf_path":       self._pdf_path,
                "dropped_frames": self._dropped_frames,
                "log_path":       self._log_path,
                # FIX D: tells backend whether session ended normally
                "shutdown_clean": not self._thread_crashed,
            }


# ── Internal: async identity worker ──────────────────────────
class _IdentityWorker:
    """
    Runs identity.verify() on a background thread.

    FIX 4 (V8.0, retained): verify() executes OUTSIDE the lock.
    Only the result assignment takes the lock (microseconds).
    """

    def __init__(self, verifier):
        self._verifier = verifier
        self._pending  = None
        self._result   = None
        self._lock     = threading.Lock()
        self._event    = threading.Event()
        self._running  = True
        self._thread   = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def request(self, frame):
        with self._lock:
            self._pending = frame.copy()
        self._event.set()

    @property
    def result(self):
        with self._lock:
            return self._result

    def stop(self):
        self._running = False
        self._event.set()

    def _run(self):
        while self._running:
            self._event.wait(timeout=1.0)
            self._event.clear()
            with self._lock:
                frame         = self._pending
                self._pending = None
            if frame is None:
                continue
            # verify() outside the lock — takes 200-500ms
            res = self._verifier.verify(frame)
            with self._lock:
                self._result = res
