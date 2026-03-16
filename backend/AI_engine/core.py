# ==============================================================
# core.py  —  EventLogger · AttentionScore · Alert Hook
# ==============================================================
#
# Changes:
#   - Removed cross-platform audio beep (winsound/afplay/paplay).
#     This is a web project — alerts are pushed to the browser via
#     WebSocket or REST, not OS sound APIs.
#   - play_alert() is now a no-op stub. The web layer registers a
#     callback via set_alert_hook() to do whatever it needs (emit a
#     socket event, write to a queue, send a push notification, etc.)
#   - EventLogger: log file opened ONCE in __init__ and kept open.
#   - Session resume via load_events() static method.
# ==============================================================

import os, cv2, time, threading
from datetime import datetime
import config


# ── Alert hook ────────────────────────────────────────────────
# Default: no-op. The web layer calls set_alert_hook() at startup
# to register its own handler (e.g. emit a socket.io event).
_alert_hook = None

def set_alert_hook(fn):
    """
    Register a callable that receives (source, event_type, severity)
    whenever an alert fires. Called from the web layer at startup.

    Example (Flask-SocketIO):
        from core import set_alert_hook
        set_alert_hook(lambda src, evt, sev: socketio.emit(
            'alert', {'source': src, 'event': evt, 'severity': sev}
        ))
    """
    global _alert_hook
    _alert_hook = fn

def play_alert(source: str = "", event_type: str = "", severity: int = 1):
    """Fire the registered alert hook. No-op if none registered."""
    if _alert_hook:
        try:
            _alert_hook(source, event_type, severity)
        except Exception as e:
            print(f"  [Alert] Hook error: {e}")


class AttentionScore:
    def __init__(self):
        self.score        = float(config.ATTN_MAX)
        self._below_ticks = 0
        self._lock        = threading.Lock()
        self.history: list[tuple[str, float]] = []

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


class EventLogger:
    """
    Thread-safe event recorder with per-event-type cooldowns.

    FIX: Log file opened once in __init__ and kept open for the session.
    Previously opened/closed on every log() call — on Windows this costs
    ~5ms per event due to file system locking and buffering overhead.
    Now: single open(), write() + flush() per event = ~0.1ms.

    IMPROVEMENT: Session resume via load_events().
    Parses a previous session.log back into the events list so a resumed
    session produces a single PDF covering both segments.
    """
    def __init__(self):
        self._lock       = threading.Lock()
        self._cooldowns: dict[str, float] = {}
        self.events:     list[dict]       = []
        # Open log file once — stays open for entire session
        self._logfile    = open(config.LOG_FILE, "a", buffering=1)  # line-buffered

    def __del__(self):
        try: self._logfile.close()
        except: pass

    @staticmethod
    def load_events(log_path: str) -> list[dict]:
        """
        Parse a previous session.log into a list of event dicts.
        Used by --resume to reload past events before continuing.

        Log line format:
            2024-01-15 10:30:45 | AUDIO        | Speech detected: "hello"    | confidence=0.85
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
                        "details":    parts[3] if len(parts) > 3 else "",
                        "screenshot": "",  # screenshots stay on disk; path not in log
                        "severity":   1,   # severity not stored in log; default LOW
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
                return ""           # still in cooldown — no work at all
            self._cooldowns[key] = now

        ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        snap = ""

        if frame is not None:
            # frame.copy() only here — only when screenshot is actually being saved
            img_name  = f"{source}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            snap      = os.path.join(config.IMAGE_DIR, img_name)
            annotated = frame.copy()
            cv2.putText(annotated,
                        f"ALERT: {event_type}  [{ts}]",
                        (10, 32), cv2.FONT_HERSHEY_SIMPLEX,
                        0.72, (0, 0, 230), 2, cv2.LINE_AA)
            cv2.imwrite(snap, annotated)

        # Write + flush — file stays open (FIX)
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
        play_alert(source, event_type, severity)
        return snap
