# AI Proctoring — Backend API Contract

This document is everything you need to integrate the AI engine
into the web backend. You never touch any detector code.
The only file you import is `proctoring_session.py`.

---

## Quick start

```python
from proctoring_session import ProctoringSession

def handle_alert(alert):
    socketio.emit("alert", alert, room=alert["session_id"])

session = ProctoringSession(
    student_id   = "S-1042",
    student_name = "Ahmed Hassan",
    on_alert     = handle_alert,
)
session.start()   # non-blocking
```

---

## Constructor

```python
ProctoringSession(
    student_id:   str,
    student_name: str      = "Student",
    on_alert:     callable = None,
    session_id:   str      = None,
)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | str | YES | Your DB identifier. Included in every alert and event. |
| `student_name` | str | no | Shown on the PDF report cover. |
| `on_alert` | callable | no | Called instantly on every new alert. Receives one Alert Object (see below). Keep this function fast — just emit a socket event or push to a queue. |
| `session_id` | str | no | Omit to auto-generate an 8-char ID. Supply the old ID to resume a previous session. |

---

## Methods

### `session.start()`
Starts the proctoring session. Non-blocking — returns immediately.
The session runs on its own background thread.
Raises RuntimeError if called twice on the same instance.

---

### `session.stop()` → Stop Result dict
Signals the session to stop, waits for clean shutdown (up to 10 seconds),
generates the PDF report, and returns the Stop Result dict.
Blocking.

---

### `session.get_status()` → Status Object dict
Thread-safe live snapshot. Call as frequently as you like — every 1s is typical for a dashboard.

---

### `session.get_events(since="YYYY-MM-DD HH:MM:SS")` → list
Returns all logged events, optionally filtered to only events at or after `since`.
Thread-safe.

---

### `session.get_frame_jpeg()` → bytes or None
Returns the latest annotated video frame as raw JPEG bytes.
Returns None before the first frame is captured.
Use this to build an MJPEG stream endpoint:

```python
@app.get("/stream/<session_id>")
def stream(session_id):
    def generate():
        while True:
            jpg = sessions[session_id].get_frame_jpeg()
            if jpg:
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                yield jpg + b"\r\n"
            time.sleep(1/25)
    return Response(generate(),
        mimetype="multipart/x-mixed-replace; boundary=frame")
```

---

### `session.state` → str
Quick state check without calling get_status().

---

## Session states

| State | Meaning |
|-------|---------|
| `idle` | Not started yet |
| `enrolling` | Capturing reference face photos (first ~10 seconds) |
| `calibrating` | Learning the student's natural head and gaze position (~6 seconds) |
| `active` | Proctoring running normally |
| `stopped` | Session ended, PDF generated |

---

## Alert Object

Sent to your `on_alert` callback and also returned in `get_events()`.

```json
{
  "session_id":  "A3F7C21B",
  "student_id":  "S-1042",
  "source":      "GAZE",
  "event_type":  "Suspicious gaze direction",
  "severity":    1,
  "timestamp":   "2024-01-15 10:23:45",
  "details":     "direction=LEFT  h=0.21",
  "screenshot":  "/path/to/evidence/GAZE_20240115_102345_123456.jpg"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | str | 8-char session identifier |
| `student_id` | str | Your DB identifier, passed in at construction |
| `source` | str | Which detector fired — see Source Values below |
| `event_type` | str | Human-readable description |
| `severity` | int | 1=low, 2=medium, 3=high, 5=critical |
| `timestamp` | str | "YYYY-MM-DD HH:MM:SS" |
| `details` | str | Extra data as a key=value string |
| `screenshot` | str | Absolute path to saved JPEG, or "" if not captured |

### Source values

| Source | Meaning |
|--------|---------|
| `EYE/HEAD` | Head turned away, or face not visible |
| `GAZE` | Eyes looking off-screen |
| `LIP` | Mouth movement (possible whispering) |
| `GLOW` | Screen/phone light reflected on face |
| `AUDIO` | Speech or media detected by microphone |
| `YOLO` | Phone, book, or extra person detected |
| `IDENTITY` | Face does not match enrolled photo |
| `ANOMALY` | Unusual behaviour pattern (AI models) |
| `SYSTEM` | Attention score sustained below threshold |

### Severity guide

| Value | Level | Examples |
|-------|-------|---------|
| 1 | Low | Gaze flicker |
| 2 | Medium | Head away, lip movement, phone glow, YOLO item |
| 3 | High | Face not visible, multiple people |
| 5 | Critical | Identity mismatch |

---

## Status Object

Returned by `get_status()`.

```json
{
  "session_id":   "A3F7C21B",
  "student_id":   "S-1042",
  "student_name": "Ahmed Hassan",
  "state":        "active",
  "attention":    74.5,
  "is_alert":     false,
  "fps":          29.8,
  "event_count":  12,
  "detectors": {
    "head":    { "head_away": false, "direction": "CENTER", "yaw_dev": 3.2, "pitch_dev": -1.1, "roll_dev": 0.8 },
    "gaze":    { "gaze_away": false, "direction": "CENTER", "avg_h": 0.50, "avg_v": 0.51 },
    "lip":     { "lar": 0.011, "lip_open": false, "lip_moving": false },
    "glow":    { "glow_score": 0.04, "glow_detected": false },
    "iforest": { "trained": true,  "score": -0.21, "anomaly": false },
    "lstm":    { "trained": false, "mse": null,    "anomaly": false }
  }
}
```

| Field | Description |
|-------|-------------|
| `attention` | 0–100. Below ~55 for 5+ seconds triggers a SYSTEM alert |
| `is_alert` | True if any detector fired this frame |
| `fps` | Current processing frame rate |
| `detectors.head.direction` | "CENTER", "LEFT", "RIGHT", "UP", or "DOWN" |
| `detectors.iforest.trained` | False during first ~2 minutes warm-up |
| `detectors.lstm.trained` | False during first ~3 minutes warm-up |

---

## Stop Result

Returned by `session.stop()`.

```json
{
  "session_id":   "A3F7C21B",
  "student_id":   "S-1042",
  "student_name": "Ahmed Hassan",
  "start_time":   "2024-01-15 10:00:00",
  "end_time":     "2024-01-15 11:00:00",
  "state":        "stopped",
  "event_count":  34,
  "events":       [ "...list of all Alert Objects..." ],
  "pdf_path":     "/app/session_reports/report_A3F7C21B_20240115_100000.pdf"
}
```

`pdf_path` is null if no events were recorded.

---

## Managing 100 concurrent students

```python
sessions: dict[str, ProctoringSession] = {}

def start_exam(student_id, student_name):
    s = ProctoringSession(
        student_id   = student_id,
        student_name = student_name,
        on_alert     = lambda a: socketio.emit("alert", a, room=student_id),
    )
    s.start()
    sessions[s.session_id] = s
    return s.session_id

def end_exam(session_id):
    result = sessions[session_id].stop()
    del sessions[session_id]
    return result   # contains pdf_path + full event list
```

Each session runs on its own thread and shares no state with others.
PDFs and evidence images are written to separate files per session automatically.

---

## Resuming an interrupted session

```python
session = ProctoringSession(
    student_id   = "S-1042",
    student_name = "Ahmed Hassan",
    session_id   = "A3F7C21B",   # the original session ID
    on_alert     = handle_alert,
)
session.start()
```

Past events are reloaded from session.log automatically.
The final PDF covers both the original and resumed segments.

---

## File outputs (served by you, written by us)

| Path | Contents |
|------|---------|
| `session_reports/report_<ID>_<ts>.pdf` | Full exam report |
| `evidence/<SOURCE>_<ts>.jpg` | Screenshot at moment of each alert |
| `dataset/<category>/<session>_<ts>.jpg` | Training snapshots |
| `session.log` | Plain-text event log |

---

## What you do NOT need to touch

- `config.py` — all thresholds and timing (ask the AI team to adjust)
- `detectors/` — all AI models
- `core.py` — event logging internals
- `reports/` — PDF generation
