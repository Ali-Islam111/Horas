// Model: Session Service - Handles student exam enrollment and submission
import { API_BASE_URL } from '../config/api';

/** Returns auth headers with the stored JWT token */
function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const sessionService = {
  /**
   * Student: Enroll in an exam and start a session.
   * POST /api/sessions/enroll/{exam_id}
   * Returns the session object (id, status, started_at, etc.)
   */
  async enrollExam(examId) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/enroll/${examId}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to enroll in exam');
    }
    return await response.json();
  },

  /**
   * Student: Submit completed exam answers.
   * POST /api/sessions/{session_id}/submit
   * @param {number} sessionId
   * @param {{ [question_id: string]: string }} answers  e.g. { "1": "Stack", "2": "O(n log n)" }
   * Returns { message, score, total_questions }
   */
  async submitExam(sessionId, answers) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit exam');
    }
    return await response.json();
  },

  /**
   * Student: Get all their own exam submissions and results.
   * GET /api/sessions/my-submissions
   */
  async getMySubmissions() {
    const response = await fetch(`${API_BASE_URL}/api/sessions/my-submissions`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load submissions');
    return await response.json();
  },

  /**
   * Student: Get AI startup status for the active session.
   * GET /api/sessions/{session_id}/ai-status
   * Returns { session_id, status }
   */
  async getAIStatus(sessionId) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/ai-status`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch AI status');
    }
    return await response.json();
  },
};
