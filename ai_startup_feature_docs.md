# Feature Documentation: AI Readiness Check (Startup Time Fix)

## Overview
Previously, the AI engine took up to a minute to start tracking (YOLO model loading, identity enrollment, audio monitoring), but the exam session started immediately. Students could bypass proctoring entirely by submitting before the AI came online.

This feature fixes the gap by introducing an **AI Readiness lifecycle**. The backend now enforces that no exam can be submitted until the AI completes calibration, and the frontend is instantly notified when the AI is ready.

---

## What Changed in the Backend

| File Modified | Purpose |
|---------------|---------|
| [models/session.py](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/models/session.py) | Added `ai_ready_at` (DateTime) column. `NULL` means the AI hasn't finished initializing yet. |
| [schemas/session.py](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/schemas/session.py) | [SessionResponse](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/schemas/session.py#15-26) now returns `ai_ready_at`. Created [AIStatusResponse](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/schemas/session.py#32-35) schema. |
| [AI_engine/proctoring_session.py](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/AI_engine/proctoring_session.py) | Created an `on_ready` callback that fires the exact millisecond calibration completes. |
| [services/proctoring_manager.py](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/services/proctoring_manager.py) | Tracks `ready_sessions` memory set. When `on_ready` fires, it saves `ai_ready_at` to the DB and pushes a message down the active WebSocket. |
| [routers/session.py](file:///c:/College/Grad%20Project%20Work/Backend/Horas%20Demo%20V1.0/backend/routers/session.py) | Added a new fallback endpoint: `GET /api/sessions/{session_id}/ai-status`. Added a strict security check on the `/submit` endpoint. |

---

## 🛠️ Frontend Integration Guide

To support this feature, the frontend needs to implement three things:

### 1. Wait for the WebSocket "Ready" Signal
When taking an exam, the UI should show a "Loading Proctoring Engine..." screen. Do not expose the exam questions yet.

Listen to the established WebSocket (`/ws/sessions/{id}`) for the follow message payload:
```json
{
  "type": "ai_ready"
}
```
As soon as you receive this, the AI is actively proctoring. You can unlock the exam UI and start the exam timer.

### 2. Handle Reconnections via HTTP Fallback
If the student's Wi-Fi drops and the WebSocket reconnects, you might miss the `ai_ready` WebSocket packet. If you're unsure of the AI state after a reconnection, call the new fallback endpoint:

**Endpoint:** `GET /api/sessions/{session_id}/ai-status` 
*(Requires standard JWT authentication)*

**Response body:**
```json
{
  "session_id": 7,
  "status": "waiting" | "initializing" | "ready" | "failed"
}
```
If `"status": "ready"`, you can safely unlock the exam UI. 

### 3. Handle Premature Submission Errors
The backend physically prevents submissions if the AI never finished starting. If an edge-case occurs and the frontend tries to submit, expect a `400 Bad Request`.

**Endpoint:** `POST /api/sessions/{session_id}/submit`

**New Error Response:**
```json
// HTTP 400 Bad Request
{
  "detail": "Cannot submit — AI proctoring has not finished initializing yet."
}
```

### 4. Reading Session Metadata
When you fetch a student's past iterations (e.g., `GET /api/sessions/my-submissions`), the response will now include an `ai_ready_at` timestamp. This can be used in the Examiner Dashboard to see precisely when proctoring began.

```json
{
  "id": 7,
  "status": "completed",
  "started_at": "2026-03-24T12:00:00Z",
  "ai_ready_at": "2026-03-24T12:00:45Z",  // Took 45 seconds to initialize
  "submitted_at": "2026-03-24T13:00:00Z"
}
```
