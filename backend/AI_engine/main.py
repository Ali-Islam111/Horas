# ==============================================================
# main.py  —  AI Proctoring System · Fixed + Optimized
# ==============================================================
#
# Fixes vs GitHub version:
#   - fres initialized to None before the loop — prevents NameError
#     crash on first frames when MEDIAPIPE_EVERY > 1
#   - identity: uses _IdentityWorker (async) — never blocks main loop
# ==============================================================

import cv2, time, uuid, numpy as np, mediapipe as mp, threading
from datetime import datetime

import config
from core                      import EventLogger, AttentionScore, play_alert
from detectors.head_pose       import HeadPoseDetector
from detectors.face_signals    import GazeDetector, LipMovementDetector, GlowDetector
from detectors.anomaly         import IForestDetector, LSTMAutoencoder, build_vector
from detectors.object_detector import ObjectDetector
from detectors.audio           import MicMonitor
from detectors.dataset_collector import DatasetCollector
from reports.pdf_report        import generate

# FIX: identity.py is an optional detector (requires deepface).
# Guard the import so the system runs even if deepface isn't installed.
try:
    from detectors.identity import IdentityVerifier
    _IDENTITY_OK = True
except Exception as _e:
    print(f"[Main] Identity detector unavailable: {_e}")
    _IDENTITY_OK = False

    class IdentityVerifier:
        """Stub — used when deepface/identity.py is unavailable."""
        def __init__(self, session_id): self.enrolled = False; self.reference_image = None; self.last_result = {}
        def enroll(self, frames): return False
        def verify(self, frame): return {"verified": True, "distance": 0.0}


_mp_mesh   = mp.solutions.face_mesh
_face_mesh = _mp_mesh.FaceMesh(
    static_image_mode        = False,
    max_num_faces            = 1,
    refine_landmarks         = True,
    min_detection_confidence = 0.65,
    min_tracking_confidence  = 0.65,
)

_hud_overlay = None


def _draw_hud(frame, attention, head, gaze, lip, glow,
              if_res, lstm_res, is_alert, calibrated, calib_pct, fps):
    global _hud_overlay
    h, w = frame.shape[:2]

    if _hud_overlay is None or _hud_overlay.shape != frame.shape:
        _hud_overlay = np.zeros_like(frame)
    _hud_overlay[:] = frame
    cv2.rectangle(_hud_overlay, (0,0), (300,h), (12,15,22), -1)
    cv2.addWeighted(_hud_overlay, 0.55, frame, 0.45, 0, frame)

    def t(s, y, col=(210,215,225), sc=0.50, bold=False):
        cv2.putText(frame, s, (8,y), cv2.FONT_HERSHEY_SIMPLEX,
                    sc, col, 2 if bold else 1, cv2.LINE_AA)

    fps_col = (0,200,80) if fps >= 25 else (0,180,255) if fps >= 15 else (0,0,220)
    cv2.putText(frame, f"{fps:.0f} FPS",
                (w-90, 28), cv2.FONT_HERSHEY_SIMPLEX,
                0.65, fps_col, 2, cv2.LINE_AA)

    pct = int(attention.value)
    col = (0,200,80) if pct>70 else (0,180,255) if pct>45 else (0,0,210)
    cv2.rectangle(frame, (8,16), (292,34), (40,40,50), -1)
    cv2.rectangle(frame, (8,16), (8+int(284*pct/100),34), col, -1)
    t(f"ATTENTION {pct}%", 30, col, 0.50, True)

    ha  = head.get("head_away",     False)
    ga  = gaze.get("gaze_away",     False)
    lm  = lip.get("lip_moving",     False)
    gld = glow.get("glow_detected", False)

    t(f"HEAD  {head.get('direction','?'):8s} "
      f"y={head.get('yaw_dev',0):+5.1f} p={head.get('pitch_dev',0):+5.1f}",
      58,  (0,80,220) if ha  else (170,230,170))
    t(f"GAZE  {gaze.get('direction','?'):8s} "
      f"h={gaze.get('avg_h',0.5):.2f}",
      80,  (0,80,220) if ga  else (170,230,170))
    t(f"LIP   {'MOVING' if lm else 'still':8s} "
      f"lar={lip.get('lar',0):.3f}",
      102, (0,80,220) if lm  else (170,230,170))
    t(f"GLOW  {'DETECTED' if gld else 'none':8s} "
      f"{glow.get('glow_score',0):.3f}",
      146, (0,80,220) if gld else (170,230,170))

    if if_res.get("score") is not None:
        t(f"IFOREST {if_res['score']:+.3f} "
          f"{'ANOMALY' if if_res.get('anomaly') else 'ok'}",
          168, (0,80,220) if if_res.get("anomaly") else (200,200,200))
    if lstm_res.get("mse") is not None:
        t(f"LSTM    {lstm_res['mse']:.4f} "
          f"{'ANOMALY' if lstm_res.get('anomaly') else 'ok'}",
          188, (0,80,220) if lstm_res.get("anomaly") else (200,200,200))

    if is_alert:
        cv2.rectangle(frame, (0,h-46), (w,h), (0,0,185), -1)
        cv2.putText(frame, "  ALERT DETECTED",
                    (w//2-130, h-16), cv2.FONT_HERSHEY_DUPLEX,
                    0.85, (255,255,255), 2)

    if not calibrated:
        cv2.rectangle(frame, (300,0), (w,56), (20,90,20), -1)
        cv2.putText(frame,
                    f"CALIBRATING — look straight ahead  [{calib_pct:.0f}%]",
                    (310,34), cv2.FONT_HERSHEY_SIMPLEX,
                    0.72, (240,240,80), 2)
    return frame


def _enrollment(cap, verifier: IdentityVerifier, n: int) -> bool:
    print(f"\n[Enrollment] Look straight at the camera — capturing {n} photos …")
    captured, frames = 0, []
    while captured < n:
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        cv2.putText(frame,
                    f"Enrollment  {captured}/{n}  —  look straight at camera",
                    (20,46), cv2.FONT_HERSHEY_SIMPLEX, 0.80, (0,220,60), 2)
        cv2.imshow("AI Proctoring — Enrollment", frame)
        cv2.waitKey(1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Enrollment always uses full frame — no face_bbox yet at this stage
        if _face_mesh.process(rgb).multi_face_landmarks:
            frames.append(frame.copy())
            captured += 1
            time.sleep(0.35)
    cv2.destroyAllWindows()
    return verifier.enroll(frames)


class _IdentityWorker:
    """Runs identity.verify() on a background thread — never blocks main loop."""
    def __init__(self, verifier: IdentityVerifier):
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
            res = self._verifier.verify(frame)
            with self._lock:
                self._result = res


def run(student_name: str = "Student", resume_session_id: str = None):
    # IMPROVEMENT: Session resume — reuse the old session_id and reload its events
    if resume_session_id:
        session_id = resume_session_id.upper()
        print(f"\n[Main] Resuming session {session_id} …")
    else:
        session_id = str(uuid.uuid4())[:8].upper()
    start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{'='*58}")
    print(f"  AI PROCTORING SYSTEM  ·  Session {session_id}")
    print(f"  Student: {student_name}  ·  {start_time}")
    print(f"{'='*58}\n")

    log      = EventLogger()
    attn     = AttentionScore()

    # IMPROVEMENT: Reload past events so the final PDF is complete
    if resume_session_id:
        past_events = EventLogger.load_events(config.LOG_FILE)
        log.events  = past_events   # prepend; new events will append normally
    verifier = IdentityVerifier(session_id)
    iforest  = IForestDetector()
    lstm     = LSTMAutoencoder()
    yolo     = ObjectDetector()

    cap = cv2.VideoCapture(config.CAMERA_INDEX, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  config.FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_H)
    cap.set(cv2.CAP_PROP_FPS,          config.TARGET_FPS)
    cap.set(cv2.CAP_PROP_BUFFERSIZE,   config.CAM_BUFFER_SIZE)
    if not cap.isOpened():
        print("[Main] Cannot open webcam.")
        return

    fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    yolo_w, yolo_h = config.YOLO_INPUT_W, config.YOLO_INPUT_H

    head_det  = HeadPoseDetector(fw, fh)
    gaze_det  = GazeDetector()
    lip_det   = LipMovementDetector()
    glow_det  = GlowDetector()

    enrolled = _enrollment(cap, verifier, config.ID_REF_FRAMES)
    if not enrolled:
        print("[Main] Enrollment skipped — identity checks disabled.")

    yolo.start()
    id_worker = _IdentityWorker(verifier)
    collector = DatasetCollector(session_id)

    def _audio_cb(display: str, conf: float, transcript: str = ""):
        log.log("AUDIO", display,
                details=f"confidence={conf:.2f}" + (f" | transcript=\"{transcript}\"" if transcript else ""),
                cooldown=config.AUDIO_COOLDOWN,
                severity=config.SEV.get("whisper", 2),
                attention=attn)

    mic = MicMonitor(_audio_cb)
    mic.start()

    head_away_prev = False
    if_res   = {"trained": False, "score": None, "anomaly": False}
    lstm_res = {"trained": False, "mse":   None, "anomaly": False}

    head  = dict(head_away=False, direction="CENTER",
                 yaw=0, pitch=0, roll=0, yaw_dev=0, pitch_dev=0, roll_dev=0)
    gaze  = dict(gaze_away=False, direction="CENTER",
                 avg_h=0.5, avg_v=0.5, left_h=0.5, right_h=0.5)
    lip   = dict(lar=0.0, lip_open=False, lip_moving=False)
    glow  = dict(glow_score=0.0, glow_detected=False)
    face_bbox  = None
    lms_cached = None

    frame_n      = 0
    fps_t0       = time.perf_counter()
    fps_count    = 0
    fps_display  = 0.0
    last_id_check= 0.0
    frame_ms     = max(1, int(1000 / config.TARGET_FPS))

    fres = None

    # IMPROVEMENT: Face ROI crop for MediaPipe.
    # Once face_bbox is established, run MediaPipe on a padded face crop
    # instead of the full 1280×720 frame. MediaPipe's internal face detection
    # is the bottleneck — cropping to ~300×300 saves ~40% of its runtime.
    # On the first frames (before bbox is known) we still use the full frame.
    _roi_pad = 60   # pixels of padding around the face bbox
    _roi_offset_x = 0
    _roi_offset_y = 0

    def _get_roi(frame, bbox, pad):
        """
        Crops the frame for MediaPipe, adding padding.
        Crucial fix: Ensures the bounding box calculations perfectly map local
        scaled coordinates back to global coordinates even when clamped.
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

    print("\n[Main] Calibrating …  Look straight ahead.\n")

    while True:
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        frame_n += 1

        fps_count += 1
        now = time.perf_counter()
        if now - fps_t0 >= 0.5:
            fps_display = fps_count / (now - fps_t0)
            fps_count   = 0
            fps_t0      = now

        rgb      = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        is_alert = False

        run_mp = (frame_n % config.MEDIAPIPE_EVERY == 0)
        if run_mp:
            # IMPROVEMENT: run MediaPipe on tight face ROI, not the full frame.
            # Landmarks are returned in ROI-relative coords — remap to full-frame.
            roi, _roi_offset_x, _roi_offset_y = _get_roi(frame, face_bbox, 20)
            roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            fres    = _face_mesh.process(roi_rgb)
            # Remap normalized landmark coords from ROI space → full-frame space
            if fres and fres.multi_face_landmarks:
                roi_h, roi_w = roi.shape[:2]
                for lm in fres.multi_face_landmarks[0].landmark:
                    lm.x = (lm.x * roi_w  + _roi_offset_x) / fw
                    lm.y = (lm.y * roi_h  + _roi_offset_y) / fh

        # ── Calibration ──────────────────────────────────────
        if not head_det.calibrated:
            calib_pct = 0.0
            if run_mp and fres is not None and fres.multi_face_landmarks:
                lms        = fres.multi_face_landmarks[0].landmark
                lms_cached = lms
                done       = head_det.calibrate_tick(lms)

                # IMPROVEMENT: Feed gaze calibration in parallel with head calibration.
                # The student is looking straight ahead during this phase — ideal data
                # for computing their personal center-gaze zone.
                lh = GazeDetector._hr(lms, config.EYE_L_OUTER, config.EYE_L_INNER, config.IRIS_LEFT)
                rh = GazeDetector._hr(lms, config.EYE_R_OUTER, config.EYE_R_INNER, config.IRIS_RIGHT)
                lv = GazeDetector._vr(lms, config.EYE_L_TOP,   config.EYE_L_BOT,   config.IRIS_LEFT)
                rv = GazeDetector._vr(lms, config.EYE_R_TOP,   config.EYE_R_BOT,   config.IRIS_RIGHT)
                gaze_det.calibrate_tick(
                    avg_h=max(0.0, min(1.0, (lh + rh) / 2)),
                    avg_v=max(0.0, min(1.0, (lv + rv) / 2)),
                )

                n_samples  = len(head_det._calib)
                total      = config.CALIB_SECONDS * config.CALIB_FPS_EST
                calib_pct  = min(100.0, 100 * n_samples / total)
                if done:
                    print("[Main] Calibration complete — proctoring active.\n")
            frame = _draw_hud(frame, attn, head, gaze, lip, glow,
                               if_res, lstm_res, False, False, calib_pct, fps_display)
            cv2.imshow("AI Proctoring System", frame)
            if cv2.waitKey(frame_ms) & 0xFF == 27: break
            continue

        # ── Active proctoring ─────────────────────────────────
        if run_mp and fres is not None and fres.multi_face_landmarks:
            lms_cached = fres.multi_face_landmarks[0].landmark

        if lms_cached is not None:
            lms = lms_cached

            lm_xs = np.array([lm.x for lm in lms]) * fw
            lm_ys = np.array([lm.y for lm in lms]) * fh
            face_bbox = (int(lm_xs.min()), int(lm_ys.min()),
                         int(lm_xs.max()), int(lm_ys.max()))

            head = head_det.process(lms)
            head_det.draw_axes(frame, lms)
            if head["head_away"]:
                is_alert = True
                if not head_away_prev:
                    log.log("EYE/HEAD", "Student looked away",
                            details=(f"direction={head['direction']}  "
                                     f"yaw={head['yaw_dev']:+.1f}°  "
                                     f"pitch={head['pitch_dev']:+.1f}°"),
                            frame=frame,
                            cooldown=config.COOLDOWN_HEAD_AWAY,
                            severity=config.SEV["head_away"],
                            attention=attn)
                head_away_prev = True
            else:
                head_away_prev = False

            gaze = gaze_det.process(lms)
            if gaze["gaze_away"]:
                is_alert = True
                log.log("GAZE", "Suspicious gaze direction",
                        details=f"direction={gaze['direction']}  h={gaze['avg_h']:.2f}",
                        cooldown=config.COOLDOWN_GAZE,
                        severity=config.SEV["gaze_away"],
                        attention=attn)

            lip = lip_det.process(lms, fw, fh)
            if lip["lip_moving"]:
                is_alert = True
                log.log("LIP", "Lip movement detected",
                        details=f"lar={lip['lar']:.3f}",
                        cooldown=config.COOLDOWN_LIP,
                        severity=config.SEV["lip_moving"],
                        attention=attn)

            if frame_n % config.GLOW_EVERY == 0:
                glow = glow_det.process(frame, face_bbox)
            if glow["glow_detected"]:
                is_alert = True
                log.log("GLOW", "Screen/phone glow on face",
                        details=f"glow_score={glow['glow_score']:.3f}",
                        frame=frame,
                        cooldown=config.COOLDOWN_GLOW,
                        severity=config.SEV["glow"],
                        attention=attn)

        else:
            face_bbox = None
            is_alert  = True
            log.log("EYE/HEAD", "Face not visible",
                    cooldown=config.COOLDOWN_NO_FACE,
                    severity=config.SEV["no_face"],
                    attention=attn)

        if frame_n % config.YOLO_EVERY == 0:
            frame_small = cv2.resize(frame, (yolo_w, yolo_h))
            yolo.enqueue(frame_small)

        det = yolo.result
        if det.person_count > 1:
            is_alert = True
            log.log("YOLO", "Multiple people detected",
                    details=f"count={det.person_count}",
                    frame=frame,
                    cooldown=config.COOLDOWN_MULTI_PERSON,
                    severity=config.SEV["multi_person"],
                    attention=attn)
        for item in set(det.items):
            is_alert = True
            sev_key  = "phone" if "phone" in item else "book"
            log.log("YOLO", f"{item.title()} detected",
                    details="Prohibited item in frame",
                    frame=frame,
                    cooldown=config.COOLDOWN_YOLO_ITEM,
                    severity=config.SEV[sev_key],
                    attention=attn)

        scale_x = fw / yolo_w
        scale_y = fh / yolo_h
        for (x1,y1,x2,y2,name,conf) in det.boxes:
            dx1,dy1 = int(x1*scale_x), int(y1*scale_y)
            dx2,dy2 = int(x2*scale_x), int(y2*scale_y)
            col = (0,200,0) if name=="person" else (0,0,220)
            cv2.rectangle(frame,(dx1,dy1),(dx2,dy2),col,2)
            cv2.putText(frame,name,(dx1,dy1-8),
                        cv2.FONT_HERSHEY_SIMPLEX,0.44,col,1)

        now_t = time.time()
        if (verifier.enrolled and
                now_t - last_id_check >= config.ID_CHECK_EVERY):
            last_id_check = now_t
            id_worker.request(frame)

        id_res = id_worker.result
        if id_res is not None and not id_res.get("verified", True):
            is_alert = True
            log.log("IDENTITY", "Identity mismatch — possible impersonation",
                    details=f"cosine_distance={id_res['distance']:.4f}",
                    frame=frame,
                    cooldown=config.COOLDOWN_IDENTITY,
                    severity=config.SEV["identity"],
                    attention=attn)

        vec      = build_vector(head, gaze, lip, glow)
        if_res   = iforest.update(vec)
        lstm_res = lstm.update(vec)

        if if_res.get("anomaly"):
            is_alert = True
            log.log("ANOMALY", "Behavioural anomaly (IForest)",
                    details=f"score={if_res['score']:.4f}",
                    cooldown=config.COOLDOWN_ANOMALY,
                    severity=config.SEV["iforest"],
                    attention=attn)
        if lstm_res.get("anomaly"):
            is_alert = True
            log.log("ANOMALY", "Temporal anomaly (LSTM)",
                    details=f"mse={lstm_res['mse']:.5f}",
                    cooldown=config.COOLDOWN_ANOMALY,
                    severity=config.SEV["lstm"],
                    attention=attn)

        if not is_alert:
            attn.recover()
        if attn.tick():
            log.log("SYSTEM", "Sustained low attention score",
                    details=f"score={attn.value:.1f}",
                    cooldown=config.COOLDOWN_ATTN_SYSTEM,
                    severity=0)

        # ── Dataset collection ────────────────────────────────
        # Build active alert list for labelling (only sources currently firing)
        _active = []
        if lms_cached is not None:
            if head.get("head_away"):   _active.append("EYE/HEAD")
            if gaze.get("gaze_away"):   _active.append("GAZE")
            if lip.get("lip_moving"):   _active.append("LIP")
            if glow.get("glow_detected"): _active.append("GLOW")
        if det.person_count > 1:        _active.append("YOLO_MULTI")
        if if_res.get("anomaly"):       _active.append("ANOMALY")
        if lstm_res.get("anomaly"):     _active.append("ANOMALY")

        _ds_state = {
            "head": head, "gaze": gaze, "lip": lip,
            "glow": glow,
            "attention": attn.value,
            "if_score": if_res.get("score"),
            "lstm_mse": lstm_res.get("mse"),
        }
        collector.tick(frame, _ds_state, _active)

        frame = _draw_hud(frame, attn, head, gaze, lip,
                          glow, if_res, lstm_res,
                          is_alert, True, 100, fps_display)
        cv2.imshow("AI Proctoring System", frame)
        if cv2.waitKey(frame_ms) & 0xFF == 27:
            print("\n[Main] ESC pressed — stopping.")
            break

    end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cap.release()
    cv2.destroyAllWindows()
    yolo.stop()
    id_worker.stop()
    mic.stop()
    collector.summary()

    print(f"\n[Main] Session {session_id} ended — {len(log.events)} events logged.")

    detector_stats = {
        "Head Pose":   {k: head.get(k)    for k in ["yaw_dev","pitch_dev","roll_dev","direction"]},
        "Gaze":        {k: gaze.get(k)    for k in ["avg_h","avg_v","direction"]},
        "Lip":         {k: lip.get(k)     for k in ["lar","lip_moving"]},
        "Screen Glow": {
            **{k: glow.get(k) for k in ["glow_score", "glow_detected"]},
            "signals": glow.get("signals", {}),  # FIX: include 4-signal breakdown for pdf_report
        },
        "IForest":     {k: if_res.get(k)  for k in ["trained","score","anomaly"]},
        "LSTM AE":     {k: lstm_res.get(k) for k in ["trained","mse","anomaly"]},
        "Identity":    verifier.last_result or {},
    }

    if log.events:
        generate(
            events            = log.events,
            session_id        = session_id,
            student_name      = student_name,
            start_time        = start_time,
            end_time          = end_time,
            reference_image   = verifier.reference_image,
            attention_history = attn.history,
            detector_stats    = detector_stats,
        )
    else:
        print("[Main] No events — PDF skipped.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AI Proctoring System")
    parser.add_argument("--name",   default="",  help="Student name")
    parser.add_argument("--resume", default="",  metavar="SESSION_ID",
                        help="Resume a previous session: reload its events and continue "
                             "recording. The final PDF will cover both segments. "
                             "Pass the 8-char session ID (e.g. A3F7C21B). "
                             "The old session.log must still be present.")
    args = parser.parse_args()
    run(student_name=args.name or input("Student name (Enter to skip): ").strip() or "Student",
        resume_session_id=args.resume or None)
