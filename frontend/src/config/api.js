// API Configuration - Central place for all backend URLs
// زميلك يقدر يغير الـ URL هنا بس
/**
 * API Configuration
 * Centralizes all API endpoints and configurations
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_BASE_URL  = import.meta.env.VITE_WS_URL  || 'ws://localhost:8000'

// للإنتاج (Production) - لو هتنشر المشروع على سيرفر
// const API_BASE_URL = 'https://your-production-api.com'
// const WS_BASE_URL  = 'wss://your-production-api.com'

export const API_ENDPOINTS = {
  // Auth
  LOGIN:      `${API_BASE_URL}/api/auth/login`,
  REGISTER:   `${API_BASE_URL}/api/auth/register`,
  GOOGLE:     `${API_BASE_URL}/api/auth/google`,

  // Exams (teacher)
  CREATE_EXAM:  `${API_BASE_URL}/api/exams/`,
  MY_EXAMS:     `${API_BASE_URL}/api/exams/my-exams`,
  GET_EXAMS:    `${API_BASE_URL}/api/exams/`,
  EXAM_BY_ID:   (id) => `${API_BASE_URL}/api/exams/${id}`,
  DELETE_EXAM:  (id) => `${API_BASE_URL}/api/exams/${id}`,

  // Questions
  ADD_QUESTION:  (examId) => `${API_BASE_URL}/api/questions/${examId}`,
  GET_QUESTIONS: (examId) => `${API_BASE_URL}/api/questions/${examId}`,

  // Sessions (student)
  ENROLL:          (examId)    => `${API_BASE_URL}/api/sessions/enroll/${examId}`,
  SUBMIT_EXAM:     (sessionId) => `${API_BASE_URL}/api/sessions/${sessionId}/submit`,
  MY_SUBMISSIONS:  `${API_BASE_URL}/api/sessions/my-submissions`,

  // Legacy REST Proctoring endpoints (kept for backward compatibility)
  UPLOAD_FRAME:                `${API_BASE_URL}/upload_frame`,
  UPLOAD_AUDIO:                `${API_BASE_URL}/upload_audio`,
  STORE_MONITORING_DATA:       `${API_BASE_URL}/store_monitoring_data`,
  GET_ALL_STUDENTS_MONITORING: `${API_BASE_URL}/get_all_students_monitoring`,

  // ── AI Proctoring (WebSocket + Events DB) ────────────────────────────────
  // WebSocket: student browser connects here to stream frames to the AI engine
  PROCTOR_WS:      (sessionId) => `${WS_BASE_URL}/ws/sessions/${sessionId}`,

  // Events: AI manager logs violations here; examiner reads them from here
  LOG_EVENT:       `${API_BASE_URL}/api/events/log`,
  GET_SESSION_EVENTS: (sessionId) => `${API_BASE_URL}/api/events/session/${sessionId}`,
  GET_ALL_EVENTS:  `${API_BASE_URL}/api/events/all`,
}

export { API_BASE_URL, WS_BASE_URL }

// استخدام:
// import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
// fetch(API_ENDPOINTS.CREATE_EXAM, {...})
