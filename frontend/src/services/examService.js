// Model: Exam Service - Handles all API calls for exams and questions
import { API_BASE_URL } from '../config/api';

const EXAM_PARSER_API = 'https://exam-parser-production.up.railway.app/parse-exam';

/** Returns auth headers with the stored JWT token */
function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const examService = {
  // ─── External Exam Parser ─────────────────────────────────────────────────
  /** Parse an exam file using the external AI parser API */
  async parseExamFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(EXAM_PARSER_API, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        throw new Error('CORS_ERROR');
      }
      throw error;
    }
  },

  // ─── Backend: Exams ───────────────────────────────────────────────────────
  /** Teacher: Create a new exam.
   *  @param {{ title, description, access_code, duration_minutes }} examData
   */
  async createExam(examData) {
    const response = await fetch(`${API_BASE_URL}/api/exams/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: examData.title,
        description: examData.description || '',
        access_code: examData.access_code || examData.accessCode,
        duration_minutes: examData.duration_minutes || examData.duration || 30,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create exam');
    }
    return await response.json();
  },

  /** Teacher: Get all exams created by the current teacher */
  async getMyExams() {
    const response = await fetch(`${API_BASE_URL}/api/exams/my-exams`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load your exams');
    return await response.json();
  },

  /** Authenticated: Get all exams */
  async getAllExams() {
    const response = await fetch(`${API_BASE_URL}/api/exams/`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load exams');
    return await response.json();
  },

  /** Get a single exam by ID */
  async getExamById(examId) {
    const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Exam not found');
    return await response.json();
  },

  /** Teacher: Delete an exam */
  async deleteExam(examId) {
    const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete exam');
  },

  // ─── Backend: Questions ───────────────────────────────────────────────────
  /** Teacher: Add one question to an exam.
   *  Body: { question_text, question_type, choice: string[], correct_choice }
   */
  async addQuestion(examId, questionData) {
    const response = await fetch(`${API_BASE_URL}/api/questions/${examId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(questionData),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add question');
    }
    return await response.json();
  },

  /** Add multiple questions to an exam in sequence */
  async addQuestions(examId, questions) {
    const results = [];
    for (const q of questions) {
      results.push(await this.addQuestion(examId, q));
    }
    return results;
  },

  /** Get all questions for an exam (students see no correct_choice) */
  async getExamQuestions(examId) {
    const response = await fetch(`${API_BASE_URL}/api/questions/${examId}`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load questions');
    return await response.json();
  },

  // ─── Helpers ──────────────────────────────────────────────────────────────
  resolveCorrectChoiceText(options = [], rawAnswer = '') {
    const safeOptions = (options || []).map((opt) => String(opt || '').trim()).filter(Boolean);
    const normalizedAnswer = String(rawAnswer || '').trim();
    if (!safeOptions.length) return '';

    // Backward compatibility: map letter-style answers from parser into option text.
    const firstChar = normalizedAnswer.charAt(0).toUpperCase();
    if (/^[A-Z]$/.test(firstChar)) {
      const idx = firstChar.charCodeAt(0) - 65;
      if (idx >= 0 && idx < safeOptions.length) {
        return safeOptions[idx];
      }
    }

    const matched = safeOptions.find(
      (opt) => opt.toLowerCase() === normalizedAnswer.toLowerCase()
    );
    return matched || safeOptions[0];
  },

  /** Format questions from the external AI parser into backend-compatible schema
   *  Backend expects: { question_text, question_type, choice: string[], correct_choice }
   */
  formatParsedQuestions(parsedQuestions) {
    return parsedQuestions.map((q) => {
      const options = [
        q.options?.[0] || '',
        q.options?.[1] || '',
        q.options?.[2] || '',
        q.options?.[3] || '',
      ];

      return {
        question_text: q.question,
        question_type: q.type === 'MCQ' ? 'MCQ' : 'MCQ', // default MCQ
        choice: options,
        correct_choice: examService.resolveCorrectChoiceText(options, q.answer || ''),
      };
    });
  },

  /** Validate exam form data before sending to backend */
  validateExam(examData) {
    const errors = [];
    if (!examData.title?.trim()) errors.push('Exam title is required');
    if (!examData.access_code?.trim()) errors.push('Access code is required');
    if (!examData.duration_minutes || examData.duration_minutes <= 0)
      errors.push('Valid duration is required (minutes)');
    return { isValid: errors.length === 0, errors };
  },
};
