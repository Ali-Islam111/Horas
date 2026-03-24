# ==============================================================
# proctoring_session.py  —  Public API for the backend team
# ==============================================================
#
# This is the ONLY file your backend friend needs to touch.
# He imports ProctoringSession, starts it, polls it, stops it.
# All AI internals stay invisible to him.
#
# Minimal integration example (Flask):
#
#   from proctoring_session import ProctoringSession
#
#   session = ProctoringSession(
#       student_id   = "S-1042",
#       student_name = "Ahmed Hassan",
#       on_alert     = lambda alert: socketio.emit("alert", alert),
#   )
#   session.start()
#
#   @app.get("/status/<sid>")
#   def status(sid):
#       return session.get_status()
#
#   @app.post("/stop/<sid>")
#   def stop(sid):
#       return session.stop()   # returns PDF path + full event list
#
# See API_CONTRACT.md for full documentation of every field.
# ==============================================================

import cv2, time, uuid, threading, queue, numpy as np, mediapipe as mp
from datetime import datetime

import config
from core                        import EventLogger, AttentionScore, set_alert_hook
from detectors.head_pose         import HeadPoseDetector
from detectors.face_signals      import GazeDetector, LipMovementDetector, GlowDetector
from detectors.anomaly           import IForestDetector, LSTMAutoencoder, build_vector
from detectors.object_detector   import ObjectDetector
from detectors.audio             import MicMonitor
from detectors.dataset_collector import DatasetCollector
from reports.pdf_report          import generate

try:
    from offline_trainer import train_iforest, train_lstm
    _TRAINER_OK = True
except ImportError:
    _TRAINER_OK = False


def _retrain_in_background():
    """
    Called automatically after every session ends.
    Retrains IForest and LSTM on all accumulated dataset JSONs.
    Runs on a daemon thread — never blocks the next session.

    Minimum data gates (200 normal samples for IForest, 100 sequences
    for LSTM) are checked inside the trainer — if there's not enough
    data yet it just prints a message and exits cleanly.
    """
    if not _TRAINER_OK:
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

try:
    from detectors.identity import IdentityVerifier
except Exception:
    class IdentityVerifier:
        """Stub — used when deepface is not installed."""
        def __init__(self, sid):
            self.enrolled        = False
            self.reference_image = None
            self.last_result     = {}
        def enroll(self, frames): return False
        def verify(self, frame):  return {"verified": True, "distance": 0.0}


# ── MediaPipe — shared across all sessions on this process ───
_mp_mesh   = mp.solutions.face_mesh
_face_mesh = _mp_mesh.FaceMesh(
    static_image_mode        = False,
    max_num_faces            = 1,
    refine_landmarks         = True,
    min_detection_confidence = 0.65,
    min_tracking_confidence  = 0.65,
)
_face_mesh_lock = threading.Lock()


class ProctoringSession:
    """
    One instance = one student's exam session.

    Lifecycle:
        session = ProctoringSession(student_id, student_name, on_alert)
        session.start()          # non-blocking — spawns background thread
        ...
        status = session.get_status()   # call whenever you need a snapshot
        result = session.stop()         # blocking until clean shutdown
    """

    # ── Constructor ──────────────────────────────────────────
    def __init__(self,
                 student_id:   str,
                 student_name: str       = "Student",
                 on_alert:     callable  = None,
                 on_ready:     callable  = None,
                 session_id:   str       = None):
        """
        Parameters
        ----------
        student_id   : your DB identifier for the student (stored in events)
        student_name : displayed in the PDF report
        on_alert     : callback fired on every new alert event.
                       Receives one dict — see API_CONTRACT.md §Alert Object.
                       Runs on the proctoring thread, keep it fast
                       (just put it in a queue or emit a socket event).
        on_ready     : callback fired once when calibration finishes and
                       active proctoring begins. Receives no arguments.
        session_id   : optional — supply to resume a previous session.
                       Omit to generate a new 8-char ID automatically.
        """
        self.student_id   = student_id
        self.student_name = student_name
        self.session_id   = (session_id or str(uuid.uuid4())[:8]).upper()
        self._on_alert    = on_alert
        self._on_ready    = on_ready

        self._start_time  = None
        self._end_time    = None
        self._state       = "idle"   # idle | enrolling | calibrating | active | stopped
        self._lock        = threading.Lock()
        self._thread      = None
        self._stop_event  = threading.Event()
        self.frame_queue  = queue.Queue(maxsize=30)

        # Detector outputs — updated every frame, readable via get_status()
        self._attention   = 100.0
        self._is_alert    = False
        self._fps         = 0.0
        self._head        = {}
        self._gaze        = {}
        self._lip         = {}
        self._glow        = {}
        self._if_res      = {}
        self._lstm_res    = {}
        self._last_frame  = None   # latest annotated JPEG bytes (for /stream endpoint)

        # These are set after stop()
        self._pdf_path    = None
        self._events      = []

    # ── Public API ───────────────────────────────────────────

    def push_frame(self, frame_bytes: bytes):
        """
        Called by your backend web server to push a JPEG frame
        received from the student's browser over WebSocket/WebRTC.
        Drops frame if the internal processing queue is full.
        """
        if not self.frame_queue.full():
            self.frame_queue.put(frame_bytes)

    def start(self):
        """
        Start the proctoring session in a background thread.
        Returns immediately — does NOT block.
        Raises RuntimeError if called twice.
        """
        if self._state != "idle":
            raise RuntimeError(f"Session {self.session_id} already started.")
        self._start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._state      = "enrolling"
        self._thread     = threading.Thread(target=self._run, daemon=True,
                                            name=f"proctor-{self.session_id}")
        self._thread.start()

    def stop(self) -> dict:
        """
        Signal the session to stop and wait for clean shutdown.
        Generates the PDF report and returns the final result dict.
        Blocking — waits up to 10 seconds.

        Returns  →  see API_CONTRACT.md §Stop Result
        """
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=10.0)
        return self._build_result()

    def get_status(self) -> dict:
        """
        Current live snapshot — call as often as you like (thread-safe).
        Returns  →  see API_CONTRACT.md §Status Object
        """
        with self._lock:
            return {
                "session_id":    self.session_id,
                "student_id":    self.student_id,
                "student_name":  self.student_name,
                "state":         self._state,
                "attention":     round(self._attention, 1),
                "is_alert":      self._is_alert,
                "fps":           round(self._fps, 1),
                "event_count":   len(self._events),
                "detectors": {
                    "head":  self._head,
                    "gaze":  self._gaze,
                    "lip":   self._lip,
                    "glow":  self._glow,
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
        """
        All logged events, optionally filtered by timestamp.

        Parameters
        ----------
        since : ISO timestamp string "YYYY-MM-DD HH:MM:SS"
                Returns only events at or after this time.
                Omit to get all events.

        Returns  →  list of Alert Objects (see API_CONTRACT.md)
        """
        with self._lock:
            events = list(self._events)
        if since:
            events = [e for e in events if e["timestamp"] >= since]
        return events

    def get_frame_jpeg(self) -> bytes | None:
        """
        Latest annotated frame as raw JPEG bytes, or None if not yet available.
        Use this to build an MJPEG /stream endpoint:

            @app.get("/stream/<session_id>")
            def stream(session_id):
                def gen():
                    while True:
                        jpg = session.get_frame_jpeg()
                        if jpg:
                            yield b"--frame\\r\\nContent-Type: image/jpeg\\r\\n\\r\\n"
                            yield jpg + b"\\r\\n"
                        time.sleep(1/30)
                return Response(gen(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")
        """
        with self._lock:
            return self._last_frame

    @property
    def state(self) -> str:
        """Quick state check: 'idle'|'enrolling'|'calibrating'|'active'|'stopped'"""
        return self._state

    # ── Internal: background thread ──────────────────────────

    def _run(self):
        """Main proctoring loop — runs entirely on its own thread."""

        # Register our alert hook so core.py calls us on every event
        set_alert_hook(self._handle_alert)

        log      = EventLogger()
        attn     = AttentionScore()
        verifier = IdentityVerifier(self.session_id)
        iforest  = IForestDetector()
        lstm     = LSTMAutoencoder()
        yolo     = ObjectDetector()
        collector= DatasetCollector(self.session_id)

        # ── Camera config fallback ───────────────────────────
        fw = config.FRAME_W
        fh = config.FRAME_H
        yolo_w, yolo_h = config.YOLO_INPUT_W, config.YOLO_INPUT_H

        # ── Detectors ────────────────────────────────────────
        head_det  = HeadPoseDetector(fw, fh)
        gaze_det  = GazeDetector()
        lip_det   = LipMovementDetector()
        glow_det  = GlowDetector()

        # ── Enrollment ───────────────────────────────────────
        self._state = "enrolling"
        enrolled    = self._do_enrollment(verifier, fh, fw)
        if not enrolled:
            print(f"[Session {self.session_id}] Enrollment skipped.")

        # ── Start background workers ─────────────────────────
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

        # ── Loop state ───────────────────────────────────────
        head  = dict(head_away=False, direction="CENTER",
                     yaw=0, pitch=0, roll=0, yaw_dev=0, pitch_dev=0, roll_dev=0)
        gaze  = dict(gaze_away=False, direction="CENTER",
                     avg_h=0.5, avg_v=0.5, left_h=0.5, right_h=0.5)
        lip   = dict(lar=0.0, lip_open=False, lip_moving=False)
        glow  = dict(glow_score=0.0, glow_detected=False, signals={})
        if_res   = {"trained": False, "score": None, "anomaly": False}
        lstm_res = {"trained": False, "mse":   None, "anomaly": False}

        face_bbox       = None
        lms_cached      = None
        head_away_prev  = False
        last_id_check   = 0.0
        fres            = None
        frame_n         = 0
        fps_t0          = time.perf_counter()
        fps_count       = 0
        fps_display     = 0.0
        _roi_pad        = 60

        self._state = "calibrating"

        # ── Main loop ────────────────────────────────────────
        while not self._stop_event.is_set():
            try:
                frame_bytes = self.frame_queue.get(timeout=1.0)
            except queue.Empty:
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

            # ── MediaPipe on face ROI ─────────────────────────
            if run_mp:
                roi, rx, ry = _get_roi(frame, face_bbox, _roi_pad)
                roi_rgb     = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
                with _face_mesh_lock:
                    fres = _face_mesh.process(roi_rgb)
                if fres and fres.multi_face_landmarks:
                    roi_h, roi_w = roi.shape[:2]
                    for lm in fres.multi_face_landmarks[0].landmark:
                        lm.x = (lm.x * roi_w + rx) / fw
                        lm.y = (lm.y * roi_h + ry) / fh

            # ── Calibration phase ─────────────────────────────
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
                if self._on_ready:
                    try:
                        self._on_ready()
                    except Exception as e:
                        print(f"[Session {self.session_id}] on_ready callback error: {e}")

            # ── Active proctoring ─────────────────────────────
            if run_mp and fres and fres.multi_face_landmarks:
                lms_cached = fres.multi_face_landmarks[0].landmark

            if lms_cached is not None:
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

                if lip["lip_moving"]:
                    is_alert = True
                    log.log("LIP", "Lip movement detected",
                            details=f"lar={lip['lar']:.3f}",
                            cooldown=config.COOLDOWN_LIP,
                            severity=config.SEV["lip_moving"], attention=attn)

                if frame_n % config.GLOW_EVERY == 0:
                    glow = glow_det.process(frame, face_bbox)
                if glow["glow_detected"]:
                    is_alert = True
                    log.log("GLOW", "Screen/phone glow on face",
                            details=f"glow_score={glow['glow_score']:.3f}",
                            frame=frame,
                            cooldown=config.COOLDOWN_GLOW,
                            severity=config.SEV["glow"], attention=attn)
            else:
                face_bbox = None
                is_alert  = True
                log.log("EYE/HEAD", "Face not visible",
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
                        severity=config.SEV["phone" if "phone" in item else "book"],
                        attention=attn)

            # ── Identity ──────────────────────────────────────
            now_t = time.time()
            if verifier.enrolled and now_t - last_id_check >= config.ID_CHECK_EVERY:
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

            # ── Anomaly models ────────────────────────────────
            vec      = build_vector(head, gaze, lip, glow)
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

            # ── Attention score ───────────────────────────────
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
                if glow.get("glow_detected"): _active.append("GLOW")
            if det.person_count > 1:          _active.append("YOLO_MULTI")
            if if_res.get("anomaly"):         _active.append("ANOMALY")
            if lstm_res.get("anomaly"):       _active.append("ANOMALY")
            collector.tick(frame, {
                "head": head, "gaze": gaze, "lip": lip,
                "glow": glow, "attention": attn.value,
                "if_score": if_res.get("score"), "lstm_mse": lstm_res.get("mse"),
            }, _active)

            # ── Push live state to get_status() ──────────────
            with self._lock:
                self._attention = attn.value
                self._is_alert  = is_alert
                self._fps       = fps_display
                self._head      = head
                self._gaze      = gaze
                self._lip       = lip
                self._glow      = glow
                self._if_res    = if_res
                self._lstm_res  = lstm_res
                self._events    = list(log.events)

            self._push_frame(frame, attn, fps_display,
                             is_alert=is_alert, calibrating=False)

        # ── Shutdown ─────────────────────────────────────────
        yolo.stop()
        id_worker.stop()
        mic.stop()
        collector.summary()
        self._end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._state    = "stopped"

        # ── Trigger background retraining ─────────────────────
        # Runs offline_trainer in a daemon thread so it doesn't block
        # the next session from starting. Models are saved to disk and
        # loaded automatically when the next ProctoringSession starts.
        threading.Thread(
            target  = _retrain_in_background,
            daemon  = True,
            name    = f"retrain-{self.session_id}",
        ).start()

        # Final state snapshot
        with self._lock:
            self._events = list(log.events)
            final_head, final_gaze = head, gaze
            final_lip              = lip
            final_glow             = glow
            final_if, final_lstm   = if_res, lstm_res

        # Generate PDF
        if log.events:
            self._pdf_path = generate(
                events            = log.events,
                session_id        = self.session_id,
                student_name      = self.student_name,
                start_time        = self._start_time,
                end_time          = self._end_time,
                reference_image   = verifier.reference_image,
                attention_history = attn.history,
                detector_stats    = {
                    "Head Pose":   {k: final_head.get(k)  for k in ["yaw_dev","pitch_dev","roll_dev","direction"]},
                    "Gaze":        {k: final_gaze.get(k)  for k in ["avg_h","avg_v","direction"]},
                    "Lip":         {k: final_lip.get(k)   for k in ["lar","lip_moving"]},
                    "Screen Glow": {**{k: final_glow.get(k) for k in ["glow_score","glow_detected"]},
                                    "signals": final_glow.get("signals", {})},
                    "IForest":     {k: final_if.get(k)   for k in ["trained","score","anomaly"]},
                    "LSTM AE":     {k: final_lstm.get(k) for k in ["trained","mse","anomaly"]},
                    "Identity":    verifier.last_result or {},
                },
            )

    # ── Internal helpers ─────────────────────────────────────

    def _handle_alert(self, record: dict):
        """Invoked by core.play_alert() on every logged event."""
        if self._on_alert is None:
            return
        
        try:
            self._on_alert({
                "session_id":  self.session_id,
                "student_id":  self.student_id,
                "source":      record.get("source", ""),
                "event_type":  record.get("event_type", ""),
                "severity":    record.get("severity", 1),
                "timestamp":   record.get("timestamp", ""),
                "details":     record.get("details", ""),
                "screenshot":  record.get("screenshot", ""),
            })
        except Exception as e:
            print(f"[Session {self.session_id}] on_alert callback error: {e}")

    def _push_frame(self, frame, attn, fps, is_alert=False, calibrating=False):
        """Encode current frame to JPEG and store for get_frame_jpeg()."""
        try:
            display = frame.copy()
            # Attention bar
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
            _, buf = cv2.imencode(".jpg", display,
                                  [cv2.IMWRITE_JPEG_QUALITY, 70])
            with self._lock:
                self._last_frame = buf.tobytes()
        except Exception:
            pass

    def _do_enrollment(self, verifier, fh, fw) -> bool:
        """Capture reference face frames during enrollment phase."""
        captured, frames = 0, []
        n = config.ID_REF_FRAMES
        timeout = time.time() + 30   # 30s max for enrollment
        while captured < n and time.time() < timeout and not self._stop_event.is_set():
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
            with _face_mesh_lock:
                fres = _face_mesh.process(rgb)
            if fres and fres.multi_face_landmarks:
                frames.append(frame.copy())
                captured += 1
                self._push_frame(frame, AttentionScore(), 0, calibrating=False)
                time.sleep(0.35)
        return verifier.enroll(frames) if frames else False

    def _build_result(self) -> dict:
        """Build the final dict returned by stop()."""
        with self._lock:
            return {
                "session_id":   self.session_id,
                "student_id":   self.student_id,
                "student_name": self.student_name,
                "start_time":   self._start_time,
                "end_time":     self._end_time,
                "state":        self._state,
                "event_count":  len(self._events),
                "events":       list(self._events),
                "pdf_path":     self._pdf_path,
            }


# ── Internal: async identity worker ─────────────────────────
class _IdentityWorker:
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
                frame = self._pending
                self._pending = None
            if frame is None:
                continue
            with self._lock:
                self._result = self._verifier.verify(frame)


# ── ROI helper ───────────────────────────────────────────────
def _get_roi(frame, bbox, pad):
    """
    Crops the frame for MediaPipe, adding padding.
    Crucial fix: Ensures the bounding box calculations perfectly map local
    scaled coordinates back to global coordinates even when clamped.
    Returns the crop, and the absolute (x,y) of the crop's top-left corner
    so landmarks can be remapped accurately.
    """
    if bbox is None:
        return frame, 0, 0
    x1, y1, x2, y2 = bbox
    h, w = frame.shape[:2]
    
    # Calculate expanded bounding box
    rx1 = x1 - pad
    ry1 = y1 - pad
    rx2 = x2 + pad
    ry2 = y2 + pad
    
    # Clamp to frame edges
    rx1_clamped = max(0, rx1)
    ry1_clamped = max(0, ry1)
    rx2_clamped = min(w, rx2)
    ry2_clamped = min(h, ry2)
    
    crop = frame[ry1_clamped:ry2_clamped, rx1_clamped:rx2_clamped]
    if crop.size == 0:
        return frame, 0, 0
        
    return crop, rx1_clamped, ry1_clamped
