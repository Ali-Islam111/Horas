# ==============================================================
# detectors/head_pose.py  —  True Euler Angles via solvePnP
# ==============================================================
#
# Fix vs GitHub version:
#   - solvePnP was called TWICE per frame: once in process() via
#     _solve(), and again independently in draw_axes().
#   - Now process() caches (rvec, tvec) and draw_axes() reuses them.
#   - Saves ~3-5ms per frame (solvePnP is iterative + matrix ops).
# ==============================================================

import cv2, time, numpy as np
from collections import deque
import config
from detectors.one_euro_filter import OneEuroFilter


class HeadPoseDetector:
    """
    Uses cv2.solvePnP + RQDecomp3x3 against MediaPipe's face mesh to
    produce true yaw / pitch / roll in degrees.

    Advantages over ratio-based approach:
      - Perspective-correct: works at any camera distance
      - Personal calibration: stores each student's neutral baseline
      - Temporal smoothing over a rolling window
      - draw_axes() renders a 3D orientation gizmo on the live feed
    """

    def __init__(self, fw: int, fh: int):
        fl = fw                          # approximate focal length = frame width
        self.cam_mtx = np.array(
            [[fl, 0, fw/2], [0, fl, fh/2], [0, 0, 1]], dtype=np.float64)
        self.dist    = np.zeros((4, 1), dtype=np.float64)
        self.fw, self.fh = fw, fh

        self._filters: dict[str, OneEuroFilter] = {}

        self._calib     = []
        self.calibrated = False
        self._base_yaw  = self._base_pitch = self._base_roll = 0.0

        # Cached rvec/tvec from last successful solve — reused by draw_axes()
        self._last_rvec = None
        self._last_tvec = None

    # ── helpers ──────────────────────────────────────────────
    def _img_pts(self, lms) -> np.ndarray:
        return np.array(
            [(lms[i].x * self.fw, lms[i].y * self.fh)
             for i in config.FACE_LM_IDS], dtype=np.float64)

    @staticmethod
    def _rotation_matrix_to_euler(R: np.ndarray) -> tuple[float, float, float]:
        sy = np.sqrt(R[0,0]**2 + R[1,0]**2)
        singular = sy < 1e-6
        if not singular:
            x = np.arctan2( R[2,1],  R[2,2])
            y = np.arctan2(-R[2,0],  sy)
            z = np.arctan2( R[1,0],  R[0,0])
        else:
            x = np.arctan2(-R[1,2],  R[1,1])
            y = np.arctan2(-R[2,0],  sy)
            z = 0.0
        return np.degrees(x), np.degrees(y), np.degrees(z)

    def _solve(self, lms):
        ok, rvec, tvec = cv2.solvePnP(
            config.FACE_3D, self._img_pts(lms),
            self.cam_mtx, self.dist,
            flags=cv2.SOLVEPNP_ITERATIVE)
        if not ok:
            return None, None, None, None, None

        rmat, _ = cv2.Rodrigues(rvec)
        roll, pitch, yaw = self._rotation_matrix_to_euler(rmat)

        def norm(a):
            return (a + 180.0) % 360.0 - 180.0
        yaw, pitch, roll = norm(yaw), norm(pitch), norm(roll)

        if abs(pitch) > 90 or abs(yaw) > 180 or abs(roll) > 180:
            return None, None, None, None, None

        return yaw, pitch, roll, rvec, tvec   # ← return rvec/tvec too

    # ── public ───────────────────────────────────────────────
    def calibrate_tick(self, lms) -> bool:
        y, p, r, rvec, tvec = self._solve(lms)
        if y is None:
            return False
        self._last_rvec, self._last_tvec = rvec, tvec
        self._calib.append((y, p, r))
        if len(self._calib) >= config.CALIB_SECONDS * config.CALIB_FPS_EST:
            arr = np.array(self._calib)
            self._base_yaw, self._base_pitch, self._base_roll = arr.mean(axis=0)
            self.calibrated = True
        return self.calibrated

    def process(self, lms) -> dict:
        y, p, r, rvec, tvec = self._solve(lms)
        if y is None:
            return dict(head_away=False, direction="unknown",
                        yaw=0, pitch=0, roll=0,
                        yaw_dev=0, pitch_dev=0, roll_dev=0)

        # Cache for draw_axes() — no second solvePnP needed
        self._last_rvec, self._last_tvec = rvec, tvec

        t = time.time()
        if not self._filters:
            self._filters["yaw"]   = OneEuroFilter(t, y, min_cutoff=0.5, beta=0.8)
            self._filters["pitch"] = OneEuroFilter(t, p, min_cutoff=0.5, beta=0.8)
            self._filters["roll"]  = OneEuroFilter(t, r, min_cutoff=0.5, beta=0.8)

        sy = self._filters["yaw"](t, y)
        sp = self._filters["pitch"](t, p)
        sr = self._filters["roll"](t, r)

        yd = sy - self._base_yaw
        pd = sp - self._base_pitch
        rd = sr - self._base_roll

        away = (abs(yd) > config.YAW_THRESHOLD or
                abs(pd) > config.PITCH_THRESHOLD or
                abs(rd) > config.ROLL_THRESHOLD)

        parts = []
        if abs(yd) > config.YAW_THRESHOLD:
            parts.append("RIGHT" if yd > 0 else "LEFT")
        if abs(pd) > config.PITCH_THRESHOLD:
            parts.append("DOWN"  if pd > 0 else "UP")

        return dict(head_away=away,
                    direction="+".join(parts) if parts else "CENTER",
                    yaw=sy, pitch=sp, roll=sr,
                    yaw_dev=yd, pitch_dev=pd, roll_dev=rd)

    def draw_axes(self, frame, lms):
        """Draw 3D orientation gizmo. Reuses cached rvec/tvec — no extra solvePnP."""
        if self._last_rvec is None or self._last_tvec is None:
            return frame
        ax  = np.float32([[100,0,0],[0,100,0],[0,0,100],[0,0,0]])
        pts, _ = cv2.projectPoints(ax, self._last_rvec, self._last_tvec,
                                   self.cam_mtx, self.dist)
        pts = pts.astype(int)
        o   = tuple(pts[3].ravel())
        cv2.line(frame, o, tuple(pts[0].ravel()), (0,   0, 220), 3)
        cv2.line(frame, o, tuple(pts[1].ravel()), (0, 220,   0), 3)
        cv2.line(frame, o, tuple(pts[2].ravel()), (220,  0,   0), 3)
        return frame
