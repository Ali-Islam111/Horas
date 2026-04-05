# ==============================================================
# core.py  —  EventLogger · AttentionScore · AlertHook (V9.0)
# ==============================================================
#
# CHANGES vs V8.0:
#
#   FIX — Per-session log file:
#     V8.0 inherited config.LOG_FILE ("session.log") — a single shared
#     path for all sessions. With 100 concurrent sessions all writing to
#     the same file: interleaved lines, garbled entries, and race conditions
#     even with line-buffering.
#     V9.0: EventLogger accepts an optional log_path. ProctoringSession
#     passes a per-session path: logs/<session_id>.log. If no path given,
#     falls back to config.LOG_FILE (safe for main.py standalone mode).
#
#   FIX — get_status() reference leak (see proctoring_session.py):
#     self._head/_gaze/_lip/_glow were returned by reference in get_status().
#     The background thread could mutate these dicts while the backend was
#     reading them. Fixed in proctoring_session.py with .copy() on assignment.
#
# Retained from V8.0:
#   - AlertHook per-session class
#   - Backwards-compat set_alert_hook() / play_alert() globals for main.py
#   - AttentionScore.history bounded deque (ATTN_HISTORY_MAX)
#   - EventLogger: log file opened once, kept open; missed_events counter
# ==============================================================

import os, cv2, time, threading
from collections import deque
from datetime import datetime
import config


# ── Per-instance alert hook ───────────────────────────────────
class AlertHook:
    """
    One instance per ProctoringSession. Replaces the V7.5/V8.0
    global _alert_hook singleton that caused cross-session alert
    routing failures.
    """

    def __init__(self):
        self._fn   = None
        self._lock = threading.Lock()

    def register(self, fn: callable):
        with self._lock:
            self._fn = fn

    def fire(self, source: str = "", event_type: str = "", severity: int = 1, record: dict = None):
        with self._lock:
            fn = self._fn
        if fn:
            try:
                if record is not None:
                    fn(source, event_type, severity, record)
                else:
                    fn(source, event_type, severity)
            except Exception as e:
                print(f"  [AlertHook] Handler error: {e}")


# ── Backwards-compat shim (for main.py standalone mode) ──────
_global_hook = AlertHook()

def set_alert_hook(fn):
    _global_hook.register(fn)

def play_alert(source: str = "", event_type: str = "", severity: int = 1):
    _global_hook.fire(source, event_type, severity)


# ── Attention score ───────────────────────────────────────────
class AttentionScore:
    def __init__(self):
        self.score        = float(config.ATTN_MAX)
        self._below_ticks = 0
        self._lock        = threading.Lock()
        self.history: deque = deque(maxlen=config.ATTN_HISTORY_MAX)

    def penalize(self, severity: int = 1):
        with self._lock:
            self.score = max(config.ATTN_MIN,
                             self.score - config.ATTN_DECAY * severity)

    def recover(self):
        with self._lock:
            self.score = min(config.ATTN_MAX,
                             self.score + config.ATTN_RECOVER)

    def tick(self) -> bool:
        ts = datetime.now().isoformat(timespec="seconds")
        with self._lock:
            self.history.append((ts, self.score))
            if self.score < config.ATTN_ALERT_THR:
                self._below_ticks += 1
            else:
                self._below_ticks = 0
            return self._below_ticks >= config.ATTN_SUSTAIN_TICKS

    @property
    def value(self) -> float:
        return self.score


# ── Event logger ──────────────────────────────────────────────
class EventLogger:
    """
    Thread-safe event recorder with per-event-type cooldowns.

    FIX (V9.0): accepts log_path parameter for per-session log files.
    Each ProctoringSession passes logs/<session_id>.log so concurrent
    sessions never write to the same file.

    Falls back to config.LOG_FILE if no path given (main.py compat).
    """

    def __init__(self, alert_hook: AlertHook = None, log_path: str = None):
        self._lock         = threading.Lock()
        self._cooldowns:   dict[str, float] = {}
        self.events:       list[dict]       = []
        self.missed_events: int             = 0
        self._alert_hook   = alert_hook or _global_hook

        # FIX: per-session log file path
        resolved_path = log_path or config.LOG_FILE
        os.makedirs(os.path.dirname(os.path.abspath(resolved_path)), exist_ok=True)
        self._logfile = open(resolved_path, "a", buffering=1, encoding="utf-8")

    def __del__(self):
        try: self._logfile.close()
        except: pass

    @staticmethod
    def load_events(log_path: str) -> list[dict]:
        """
        Parse a previous session log file into a list of event dicts.
        Used by session resume to reload past events.
        """
        events = []
        if not os.path.exists(log_path):
            print(f"  [Resume] Log not found: {log_path}")
            return events
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) < 3:
                        continue
                    events.append({
                        "timestamp":  parts[0],
                        "source":     parts[1],
                        "event_type": parts[2],
                        "details":    (parts[3] if len(parts) > 3 else "") +
                                      " [severity unverified — resumed from log]",
                        "screenshot": "",
                        "severity":   1,
                    })
            print(f"  [Resume] Loaded {len(events)} past events from {log_path}")
        except Exception as e:
            print(f"  [Resume] Could not read log: {e}")
        return events

    def log(self,
            source:     str,
            event_type: str,
            details:    str   = "",
            frame             = None,
            cooldown:   float = 0.0,
            severity:   int   = 1,
            attention         = None) -> str:

        key = f"{source}::{event_type}"
        now = time.time()
        with self._lock:
            if cooldown > 0 and now - self._cooldowns.get(key, 0) < cooldown:
                self.missed_events += 1
                return ""
            self._cooldowns[key] = now

        ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        snap = ""

        if frame is not None:
            img_name  = f"{source}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            snap      = os.path.join(config.IMAGE_DIR, img_name)
            annotated = frame.copy()
            cv2.putText(annotated,
                        f"ALERT: {event_type}  [{ts}]",
                        (10, 32), cv2.FONT_HERSHEY_SIMPLEX,
                        0.72, (0, 0, 230), 2, cv2.LINE_AA)
            cv2.imwrite(snap, annotated)

        entry = (f"{ts} | {source.upper():<12} | "
                 f"{event_type:<32} | {details}\n")
        self._logfile.write(entry)
        self._logfile.flush()

        record = {
            "timestamp":  ts,
            "source":     source.upper(),
            "event_type": event_type,
            "details":    details,
            "screenshot": snap,
            "severity":   severity,
        }
        with self._lock:
            self.events.append(record)

        if attention:
            attention.penalize(severity)

        print(f"  [ALERT][{source.upper()}] {event_type}  "
              f"{details.split(' | ')[0]}")
        self._alert_hook.fire(source, event_type, severity, record)
        return snap
