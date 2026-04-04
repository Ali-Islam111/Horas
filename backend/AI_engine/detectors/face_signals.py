# ==============================================================
# detectors/face_signals.py  —  Gaze · Lip (GlowDetector removed V10.0)
# ==============================================================
#
# Fixes vs GitHub version:
#   - GazeDetector: direction labels now use tolerance-adjusted
#     h_min/h_max/v_min/v_max instead of raw config values.
#     Previously: avg_h=0.25 with H_MIN=0.30, TOL=0.20 → h_away=True
#     (correct, since 0.25 < 0.10) but direction="RIGHT" (wrong).
#     Now: direction correctly reports "LEFT".
# ==============================================================

import cv2, time, numpy as np
from collections import deque
import config
from detectors.one_euro_filter import OneEuroFilter


# ── Iris Gaze ─────────────────────────────────────────────────
class GazeDetector:
    """
    Horizontal + vertical iris position relative to eye corners.
    Returns ratio in [0,1]:  0=hard left, 0.5=center, 1=hard right.
    Uses MediaPipe refined iris landmarks (468-477).

    Two-stage filtering:
      1. Smoothing buffer (GAZE_SMOOTH frames) — eliminates single-frame jitter
      2. Sustained-away buffer (GAZE_MIN_AWAY_FRAMES) — requires consecutive
         off-center readings before flagging, prevents brief eye movement alerts

    IMPROVEMENT: Adaptive calibration
      During the head-pose calibration phase (first GAZE_CALIB_FRAMES frames),
      collects the student's natural center-gaze to compute a personal H/V
      center and half-width tolerance. Accounts for natural eye asymmetry,
      glasses, and facial geometry differences between students.
      Falls back to config defaults if calibration doesn't converge.
    """
    def __init__(self):
        self._filters: dict[str, OneEuroFilter] = {}
        self._h_away_buf = deque(maxlen=config.GAZE_MIN_AWAY_FRAMES)
        self._v_away_buf = deque(maxlen=config.GAZE_MIN_AWAY_FRAMES)

        # Adaptive calibration state
        self._calib_h:    list[float] = []
        self._calib_v:    list[float] = []
        self.calibrated:  bool        = False
        # Personal zone — initialized to config defaults, overwritten on calibration
        self._h_center = (config.GAZE_H_MIN + config.GAZE_H_MAX) / 2
        self._v_center = (config.GAZE_V_MIN + config.GAZE_V_MAX) / 2
        self._h_half   = max(config.GAZE_CALIB_MIN_RANGE,
                             (config.GAZE_H_MAX - config.GAZE_H_MIN) / 2 + config.GAZE_H_TOL)
        self._v_half   = max(config.GAZE_CALIB_MIN_RANGE,
                             (config.GAZE_V_MAX - config.GAZE_V_MIN) / 2 + config.GAZE_V_TOL)

    def calibrate_tick(self, avg_h: float, avg_v: float) -> bool:
        """
        Feed one frame of known center-gaze (called during head-pose calibration).
        Returns True once calibration is complete.
        """
        if self.calibrated:
            return True
        self._calib_h.append(avg_h)
        self._calib_v.append(avg_v)
        if len(self._calib_h) >= config.GAZE_CALIB_FRAMES:
            h_arr = np.array(self._calib_h)
            v_arr = np.array(self._calib_v)
            
            # Protect from poisoning: if the student looks away or down during calibration,
            # the standard deviation will be high, or the center will be far from 0.5.
            h_std, v_std = float(h_arr.std()), float(v_arr.std())
            h_mean, v_mean = float(h_arr.mean()), float(v_arr.mean())
            
            if h_std > 0.15 or v_std > 0.15 or abs(h_mean - 0.5) > 0.25 or abs(v_mean - 0.5) > 0.25:
                print(f"  [Gaze] Calibration rejected (excessive variance or off-center). "
                      f"Using config defaults. (std: H={h_std:.2f}, V={v_std:.2f})")
                self.calibrated = True
                return True

            self._h_center = h_mean
            self._v_center = v_mean
            self._h_half   = max(config.GAZE_CALIB_MIN_RANGE, h_std * config.GAZE_CALIB_STD_MULT)
            self._v_half   = max(config.GAZE_CALIB_MIN_RANGE, v_std * config.GAZE_CALIB_STD_MULT)
            self.calibrated = True
            print(f"  [Gaze] Personal zone calibrated: "
                  f"H={self._h_center:.2f}±{self._h_half:.2f}  "
                  f"V={self._v_center:.2f}±{self._v_half:.2f}")
        return self.calibrated

    @staticmethod
    def _hr(lms, outer, inner, iris):
        ox, ix, rx = lms[outer].x, lms[inner].x, lms[iris].x
        return (rx - min(ox, ix)) / (abs(ix - ox) + 1e-6)

    @staticmethod
    def _vr(lms, top, bot, iris):
        ty, by, ry = lms[top].y, lms[bot].y, lms[iris].y
        return (ry - min(ty, by)) / (abs(by - ty) + 1e-6)

    def process(self, lms) -> dict:
        lh = self._hr(lms, config.EYE_L_OUTER, config.EYE_L_INNER, config.IRIS_LEFT)
        rh = self._hr(lms, config.EYE_R_OUTER, config.EYE_R_INNER, config.IRIS_RIGHT)
        lv = self._vr(lms, config.EYE_L_TOP,   config.EYE_L_BOT,   config.IRIS_LEFT)
        rv = self._vr(lms, config.EYE_R_TOP,   config.EYE_R_BOT,   config.IRIS_RIGHT)

        raw_avg_h = (lh + rh) / 2
        raw_avg_v = (lv + rv) / 2

        t = time.time()
        if not self._filters:
            self._filters["h"] = OneEuroFilter(t, raw_avg_h, min_cutoff=0.1, beta=1.0)
            self._filters["v"] = OneEuroFilter(t, raw_avg_v, min_cutoff=0.1, beta=1.0)
            self._filters["lh"] = OneEuroFilter(t, lh, min_cutoff=0.1, beta=1.0)
            self._filters["rh"] = OneEuroFilter(t, rh, min_cutoff=0.1, beta=1.0)

        avg_h = self._filters["h"](t, raw_avg_h)
        avg_v = self._filters["v"](t, raw_avg_v)
        left_h = self._filters["lh"](t, lh)
        right_h = self._filters["rh"](t, rh)

        # Clamp to [0,1] — glasses reflections can push iris landmarks wild
        avg_h = max(0.0, min(1.0, avg_h))
        avg_v = max(0.0, min(1.0, avg_v))

        # IMPROVEMENT: Use personal calibrated zone if available,
        # else fall back to config defaults with tolerance offsets.
        h_min = self._h_center - self._h_half
        h_max = self._h_center + self._h_half
        v_min = self._v_center - self._v_half
        v_max = self._v_center + self._v_half

        h_away_raw = not (h_min <= avg_h <= h_max)
        v_away_raw = not (v_min <= avg_v <= v_max)

        # Sustained-away filtering — require N consecutive away frames
        self._h_away_buf.append(h_away_raw)
        self._v_away_buf.append(v_away_raw)
        h_away = all(self._h_away_buf) and len(self._h_away_buf) == config.GAZE_MIN_AWAY_FRAMES
        v_away = all(self._v_away_buf) and len(self._v_away_buf) == config.GAZE_MIN_AWAY_FRAMES
        away   = h_away or v_away

        parts = []
        if h_away:
            parts.append("LEFT" if avg_h < (h_min + h_max) / 2 else "RIGHT")
        if v_away:
            parts.append("UP"   if avg_v < (v_min + v_max) / 2 else "DOWN")

        return dict(gaze_away=away,
                    direction=" + ".join(parts) or "CENTER",
                    avg_h=float(avg_h), avg_v=float(avg_v),
                    left_h=float(left_h), right_h=float(right_h))


# ── Lip Movement ─────────────────────────────────────────────
class LipMovementDetector:
    """
    Lip Aspect Ratio (vertical gap / horizontal width).
    LIP_CONSEC consecutive open readings → talking flag.
    Independent of the audio channel — useful corroboration.
    """
    def __init__(self):
        self._buf = deque(maxlen=config.LIP_CONSEC)

    def process(self, lms, fw, fh) -> dict:
        vert  = abs(lms[config.LIP_TOP_ID].y - lms[config.LIP_BOT_ID].y)    * fh
        horiz = abs(lms[config.LIP_LEFT_ID].x - lms[config.LIP_RIGHT_ID].x) * fw + 1e-6
        lar   = vert / horiz
        open_ = lar > config.LIP_OPEN_THR
        self._buf.append(open_)
        moving = all(self._buf) and len(self._buf) == config.LIP_CONSEC
        return dict(lar=float(lar), lip_open=open_, lip_moving=moving)


