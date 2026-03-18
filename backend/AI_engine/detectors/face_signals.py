# ==============================================================
# detectors/face_signals.py  —  Gaze · Lip · Blink · Glow
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


# ── Screen / Phone Glow — 4-Signal Fusion ────────────────────
class GlowDetector:
    """
    Detects screen/phone light on face using four independent signals.
    Requires 2+ signals active simultaneously to trigger — kills false
    positives from normal lighting changes that fool single-signal detectors.

    Signal 1 — Brightness spike (HSV V channel)
        Any screen — white, blue, warm, cool — raises face brightness.
        Compared to a per-session calibrated baseline so ambient light
        level doesn't matter. Catches Google Docs, YouTube, everything.

    Signal 2 — Saturation drop (HSV S channel)
        Screen light is broad-spectrum and washes out skin color.
        A drop in face saturation vs baseline indicates external light.

    Signal 3 — Temporal flicker (brightness variance over 10 frames)
        Screens change content → face brightness fluctuates slightly.
        Static room lighting has near-zero variance. Most reliable signal.

    Signal 4 — BGR blue excess (original method, now one vote of four)
        Still useful for phones held close with strong blue cast.

    Fusion: weighted_score > GLOW_FUSION_THR AND n_signals_firing >= 2
    """

    _W_BRIGHT  = 0.30
    _W_SAT     = 0.25
    _W_FLICKER = 0.35
    _W_BLUE    = 0.10
    _CALIB_FRAMES = 20

    def __init__(self):
        self._score_buf  = deque(maxlen=config.GLOW_SMOOTH)
        self._v_baseline = None
        self._s_baseline = None
        self._calib_buf  = []
        self._calib_done = False
        self._v_history  = deque(maxlen=10)
        self._blue_buf   = deque(maxlen=config.GLOW_SMOOTH)

    def _crop(self, frame, bbox):
        if bbox is None: return None
        x1, y1, x2, y2 = bbox
        x1,y1 = max(0,x1), max(0,y1)
        x2,y2 = min(frame.shape[1],x2), min(frame.shape[0],y2)
        c = frame[y1:y2, x1:x2]
        return c if c.size > 0 else None

    def process(self, frame, bbox) -> dict:
        crop = self._crop(frame, bbox)
        if crop is None:
            self._score_buf.append(0.0)
            return dict(glow_score=0.0, glow_detected=False, signals={})

        hsv    = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV).astype(np.float32)
        v_mean = float(np.mean(hsv[:,:,2]))
        s_mean = float(np.mean(hsv[:,:,1]))

        # ── Calibration (first CALIB_FRAMES frames) ──────────
        if not self._calib_done:
            self._calib_buf.append((v_mean, s_mean))
            if len(self._calib_buf) >= self._CALIB_FRAMES:
                arr = np.array(self._calib_buf)
                self._v_baseline = float(arr[:,0].mean())
                self._s_baseline = float(arr[:,1].mean())
                self._calib_done = True
            self._score_buf.append(0.0)
            return dict(glow_score=0.0, glow_detected=False,
                        signals={"calibrating": True})

        self._v_history.append(v_mean)

        # ── Signal 1: Brightness spike ────────────────────────
        v_delta = v_mean - self._v_baseline
        s1 = min(1.0, max(0.0,
            (v_delta - config.GLOW_V_SPIKE_MIN) /
            (config.GLOW_V_SPIKE_MAX - config.GLOW_V_SPIKE_MIN + 1e-6)))
        s1_flag = v_delta > config.GLOW_V_SPIKE_MIN

        # ── Signal 2: Saturation drop ─────────────────────────
        s_delta = self._s_baseline - s_mean
        s2 = min(1.0, max(0.0,
            (s_delta - config.GLOW_S_DROP_MIN) /
            (config.GLOW_S_DROP_MAX - config.GLOW_S_DROP_MIN + 1e-6)))
        s2_flag = s_delta > config.GLOW_S_DROP_MIN

        # ── Signal 3: Temporal flicker ────────────────────────
        if len(self._v_history) >= 5:
            v_var  = float(np.var(list(self._v_history)))
            s3 = min(1.0, max(0.0,
                (v_var - config.GLOW_FLICKER_MIN) /
                (config.GLOW_FLICKER_MAX - config.GLOW_FLICKER_MIN + 1e-6)))
            s3_flag = v_var > config.GLOW_FLICKER_MIN
        else:
            v_var = 0.0; s3 = 0.0; s3_flag = False

        # ── Signal 4: BGR blue excess ─────────────────────────
        b = crop[:,:,0].astype(float)
        r = crop[:,:,2].astype(float)
        blue_ratio = float(((b - r) > config.GLOW_BLUE_EXCESS).sum()) / (crop.shape[0]*crop.shape[1] + 1)
        self._blue_buf.append(blue_ratio)
        blue_smooth = float(np.mean(self._blue_buf))
        s4 = min(1.0, blue_smooth / (config.GLOW_AREA_MIN + 1e-6))
        s4_flag = blue_smooth > config.GLOW_AREA_MIN * 0.5

        # ── Fusion ────────────────────────────────────────────
        weighted = (self._W_BRIGHT  * s1 +
                    self._W_SAT     * s2 +
                    self._W_FLICKER * s3 +
                    self._W_BLUE    * s4)
        n_flags  = sum([s1_flag, s2_flag, s3_flag, s4_flag])

        self._score_buf.append(weighted)
        smooth = float(np.mean(self._score_buf))
        detected = smooth > config.GLOW_FUSION_THR and n_flags >= 2

        return dict(
            glow_score    = round(smooth, 4),
            glow_detected = detected,
            signals       = {
                "brightness_spike": round(s1, 3),
                "saturation_drop":  round(s2, 3),
                "flicker":          round(s3, 3),
                "blue_excess":      round(s4, 3),
                "n_signals":        n_flags,
                "v_delta":          round(v_delta, 1),
                "v_variance":       round(v_var, 2),
            }
        )
