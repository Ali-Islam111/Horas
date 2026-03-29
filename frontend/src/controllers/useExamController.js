import { useState, useEffect, useCallback, useRef } from 'react';
import { examService } from '../services/examService';
import { sessionService } from '../services/sessionService';

const userRole = () => localStorage.getItem('user_role');

/**
 * useExamController (Controller Layer)
 *
 * Provides state + actions for all exam-related UI:
 *   - Instructor: create exam, add questions, view/delete their exams
 *   - Student:    browse exams, enroll, take exam, submit, see results
 */
export function useExamController(onNavigate) {
  const [exams, setExams] = useState([]);
  const [currentExam, setCurrentExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected option text }
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { score, total_questions, message }
  const submitInFlightRef = useRef(false);

  // ─── Shared: load all exams ──────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const role = userRole();
      const data = role === 'teacher'
        ? await examService.getMyExams()
        : await examService.getAllExams();
      setExams(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadExams(); 
    }
  }, [loadExams]);

  // ─── Teacher: Create exam + questions ───────────────────────────────────
  const handleCreateExam = async (examData, parsedQuestions = []) => {
    setIsLoading(true);
    setError(null);
    try {
      // Bundle questions for batch creation
      const payload = {
        ...examData,
        questions: parsedQuestions.length > 0 ? examService.formatParsedQuestions(parsedQuestions) : [],
      };

      // Create the exam + questions automatically via backend transaction
      const newExam = await examService.createExam(payload);

      // Reload exams list
      await loadExams();
      return newExam;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    try {
      await examService.deleteExam(examId);
      setExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Student: Enroll and load exam questions ────────────────────────────
  const handleEnrollExam = async (examId) => {
    setIsLoading(true);
    setError(null);
    try {
      // Start or resume session
      const sessionData = await sessionService.enrollExam(examId);
      setSession(sessionData);
      localStorage.setItem('session_id', String(sessionData.id));
      localStorage.setItem('current_session_id', String(sessionData.id));

      // Load the exam metadata
      const examData = await examService.getExamById(examId);
      setCurrentExam(examData);

      // Load questions (correct_choice is hidden for students by backend)
      const qs = await examService.getExamQuestions(examId);
      setQuestions(qs);

      const existingAnswers = sessionData.student_answers || {};
      setAnswers(existingAnswers);

      // If this session is already completed, jump to result screen directly.
      if (sessionData.status === 'completed') {
        setResult({
          message: 'Exam already submitted',
          score: sessionData.final_score || 0,
          total_questions: qs.length,
        });
        if (onNavigate) onNavigate('examSubmission');
        return;
      }

      // Reset previous result when starting/resuming an active session.
      setResult(null);

      // Navigate to exam page
      if (onNavigate) onNavigate('exam');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Student: Answer a question ─────────────────────────────────────────
  const handleAnswer = (questionId, choice) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: choice }));
  };

  // ─── Student: Submit exam ────────────────────────────────────────────────
  const handleSubmitExam = async () => {
    if (submitInFlightRef.current) {
      return null;
    }

    if (!session) {
      setError('No active session found. Please start the exam from dashboard.');
      return null;
    }

    if (session.status === 'completed') {
      setError('This exam has already been submitted.');
      return null;
    }

    submitInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const submitResult = await sessionService.submitExam(session.id, answers);
      setResult(submitResult);
      setSession((prev) => prev ? {
        ...prev,
        status: 'completed',
        final_score: submitResult.score,
        student_answers: answers,
      } : prev);
      localStorage.removeItem('current_session_id');
      return submitResult;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      submitInFlightRef.current = false;
    }
  };

  // ─── Student: Load past submissions ─────────────────────────────────────
  const loadMySubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await sessionService.getMySubmissions();
      setSubmissions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    state: {
      exams,
      currentExam,
      questions,
      session,
      answers,
      submissions,
      isLoading,
      error,
      result,
    },
    // Actions
    actions: {
      loadExams,
      handleCreateExam,
      handleDeleteExam,
      handleEnrollExam,
      handleAnswer,
      handleSubmitExam,
      loadMySubmissions,
      clearError: () => setError(null),
    },
  };
}
