/**
 * proctoringService.js
 * ─────────────────────────────────────────────────────────────
 * Service layer for the AI proctoring features.
 *
 * Two main responsibilities:
 *  1. connectProctoringWS  — opens a WebSocket to the AI backend and
 *     streams video frames. Returns control methods (sendFrame, close).
 *  2. fetchSessionEvents   — fetches all AI-detected events for a session
 *     (used by the Examiner's Alerts/Report pages).
 */

import { API_ENDPOINTS } from '../config/api'

// ─────────────────────────────────────────────────────────────────────────────
// 1. WebSocket Proctoring Connection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens a WebSocket to /ws/proctor/{sessionId}.
 *
 * @param {string|number} sessionId  - The active exam session ID
 * @param {Function}      onAlert    - Called with an alert object whenever the
 *                                     AI detects a violation:
 *                                     { type, category, message }
 * @param {Function}      onOpen     - Called when the connection is ready
 * @param {Function}      onClose    - Called when the connection closes
 * @param {Function}      onError    - Called on connection errors
 *
 * @returns {{ sendFrame: Function, close: Function, ws: WebSocket }}
 */
export function connectProctoringWS(sessionId, { onAlert, onOpen, onClose, onError } = {}) {
  const url = API_ENDPOINTS.PROCTOR_WS(sessionId)
  console.log(`[ProctoringService] 🔌 Connecting to ${url}`)

  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    console.log(`[ProctoringService] ✅ WebSocket open for session ${sessionId}`)
    onOpen?.()
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'alert') {
        console.warn(`[ProctoringService] 🚨 Alert received:`, data)
        onAlert?.(data)
      }
    } catch (e) {
      // Non-JSON message — ignore
    }
  }

  ws.onclose = (event) => {
    console.log(`[ProctoringService] 🔌 WebSocket closed (${event.code})`)
    onClose?.(event)
  }

  ws.onerror = (error) => {
    console.error(`[ProctoringService] ❌ WebSocket error:`, error)
    onError?.(error)
  }

  /**
   * Captures a JPEG frame from a <video> element and sends it over WebSocket.
   * @param {HTMLVideoElement} videoElement
   * @param {number}           quality  - JPEG quality 0–1 (default 0.7)
   */
  const sendFrame = (videoElement, quality = 0.7) => {
    if (!videoElement || ws.readyState !== WebSocket.OPEN) return

    const canvas = document.createElement('canvas')
    canvas.width  = videoElement.videoWidth  || 640
    canvas.height = videoElement.videoHeight || 480

    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob || ws.readyState !== WebSocket.OPEN) return
      blob.arrayBuffer().then((buffer) => {
        ws.send(buffer)
      })
    }, 'image/jpeg', quality)
  }

  /** Gracefully closes the WebSocket */
  const close = () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
  }

  return { sendFrame, close, ws }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Events Fetching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all AI-detected events for a given session from the backend.
 * @param {string|number} sessionId
 * @returns {Promise<Array>} List of event objects
 */
export async function fetchSessionEvents(sessionId) {
  const url = API_ENDPOINTS.GET_SESSION_EVENTS(sessionId)
  const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token')

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch events for session ${sessionId}: ${res.status}`)
  }
  return res.json()
}

/**
 * Fetches all AI-detected events across all sessions (for the global Alerts page).
 * @returns {Promise<Array>} List of event objects
 */
export async function fetchAllEvents() {
  const url = API_ENDPOINTS.GET_ALL_EVENTS
  const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token')

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch all events: ${res.status}`)
  }
  return res.json()
}
