// Controller: useExamCreation Hook - Business logic for exam creation
import { useState, useEffect } from 'react';
import { examService } from '../services/examService';
import { API_BASE_URL } from '../config/api';

export const useExamCreation = () => {
  const generateAccessCode = () => `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Hydrate draft from localStorage
  const getDraft = () => {
    try {
      return JSON.parse(localStorage.getItem('exam_draft')) || {};
    } catch { return {}; }
  };
  const draft = getDraft();

  // State management
  const [examTitle, setExamTitle] = useState(draft.examTitle || '');
  const [examDescription, setExamDescription] = useState(draft.examDescription || '');
  const [accessCode, setAccessCode] = useState(draft.accessCode || generateAccessCode());
  const [duration, setDuration] = useState(draft.duration || '');
  const [totalMarks, setTotalMarks] = useState(draft.totalMarks || '');
  const [passingMarks, setPassingMarks] = useState(draft.passingMarks || '');
  const [questions, setQuestions] = useState(draft.questions || []);

  const normalizeQuestion = (question, index = 0) => {
    const options = Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : ['', '', '', ''];
    const type = question.type === 'tf' ? 'truefalse' : (question.type || 'mcq');
    const correctAnswer = question.correctAnswer || '';
    const correctAnswerIndex = options.findIndex((opt) => opt === correctAnswer);

    return {
      id: question.id || `q-${Date.now()}-${index}`,
      type,
      question: question.question || question.text || '',
      marks: Number(question.marks) || 1,
      options,
      correctAnswer,
      correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : null,
    };
  };

  const toBackendQuestion = (question) => {
    const options = (question.options || []).map((opt) => String(opt || '').trim()).filter(Boolean);
    const safeOptions = options.length >= 2 ? options : ['Option A', 'Option B'];

    const normalizedCorrectAnswer = String(question.correctAnswer || '').trim().toLowerCase();

    let answerIndexFromText = safeOptions.findIndex(
      (opt) => String(opt).trim().toLowerCase() === normalizedCorrectAnswer
    );

    // Support letter-style answers from AI/manual inputs: A, b, C), D.
    if (answerIndexFromText < 0 && normalizedCorrectAnswer) {
      const first = normalizedCorrectAnswer[0];
      if (['a', 'b', 'c', 'd'].includes(first)) {
        answerIndexFromText = first.charCodeAt(0) - 97;
      }
    }

    const resolvedIndex = question.correctAnswerIndex ?? (answerIndexFromText >= 0 ? answerIndexFromText : 0);
    const clampedIndex = Math.max(0, Math.min(resolvedIndex, safeOptions.length - 1));
    const correctChoiceText = safeOptions[clampedIndex];

    return {
      question_text: question.question,
      question_type: question.type === 'truefalse' ? 'TF' : 'MCQ',
      choice: safeOptions,
      correct_choice: correctChoiceText,
      points: Number(question.marks) || 1,
    };
  };

  // Wizard state
  const [currentStep, setCurrentStep] = useState(draft.currentStep || 1);
  const [stepErrors, setStepErrors] = useState({});

  // Save to localStorage on changes
  useEffect(() => {
    const draftData = {
      examTitle, examDescription, accessCode, duration,
      totalMarks, passingMarks, questions, currentStep
    };
    localStorage.setItem('exam_draft', JSON.stringify(draftData));
  }, [examTitle, examDescription, accessCode, duration, totalMarks, passingMarks, questions, currentStep]);

  // Computed: live running total of assigned question marks
  const assignedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const nextStep = () => {
    if (currentStep === 1) {
      const errors = {};
      if (!examTitle.trim()) errors.examTitle = 'Title is required';
      if (!duration || parseInt(duration) <= 0) errors.duration = 'Valid duration is required';
      if (!totalMarks || parseInt(totalMarks) <= 0) errors.totalMarks = 'Valid total marks is required';
      if (!passingMarks || parseInt(passingMarks) <= 0) errors.passingMarks = 'Valid passing marks is required';
      if (parseInt(passingMarks) >= parseInt(totalMarks)) errors.passingMarks = 'Passing marks must be less than total marks';

      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        return;
      }
    }

    if (currentStep === 2) {
      const errors = {};
      if (questions.length === 0) {
        errors.questions = 'At least one question is required';
      } else if (assignedMarks !== parseInt(totalMarks)) {
        errors.questions = `Assigned marks (${assignedMarks}) must equal total marks (${totalMarks})`;
      } else if (questions.some(q => q.correctAnswerIndex === null)) {
        errors.questions = 'All questions must have a correct answer selected before proceeding.';
      }
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        return;
      }
    }

    setStepErrors({});
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Parser file states (Version 2)
  const [stagedFile, setStagedFile] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState('');

  // Handle staging on input change
  const handleFileStage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStagedFile(file);
    setParseError('');
  };

  // Handle abort upload
  const handleAbortUpload = () => {
    setStagedFile(null);
    setParseError('');
  };

  // Extract questions using deterministic backend service
  const handleExtractQuestions = async (showToast, t, language) => {
    if (!stagedFile) return;

    setIsParsingFile(true);
    setParseError('');

    try {
      const formData = new FormData();
      formData.append('file', stagedFile);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/exams/parse`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status code ${response.status}`);
      }

      const result = await response.json();
      const extractedQuestions = result.questions || [];
      const warnings = result.warnings || [];

      if (extractedQuestions.length === 0) {
        throw new Error('No valid multiple-choice questions found in the document.');
      }

      // Format and append
      const formatted = extractedQuestions.map((q, index) => {
        const options = Array.isArray(q.options) && q.options.length > 0
          ? q.options
          : ['', '', '', ''];
        const correctAnswer = q.correct_answer || '';
        const correctAnswerIndex = options.findIndex((opt) => opt === correctAnswer);

        return {
          id: `extracted-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'mcq',
          question: q.text || '',
          marks: Number(q.marks) || 1,
          options,
          correctAnswer,
          correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : null,
        };
      });

      setQuestions((prev) => [...prev, ...formatted]);

      const hasMissingAnswer = formatted.some((q) => q.correctAnswerIndex === null);

      if (warnings.length > 0 || hasMissingAnswer) {
        showToast(
          language === 'ar'
            ? `تم استخراج ${formatted.length} أسئلة. تحقق من الأسئلة المميزة - لم يتم تحديد الإجابة الصحيحة.`
            : `${formatted.length} questions extracted. Check highlighted questions — correct answer could not be detected.`,
          'warning'
        );
      } else {
        showToast(
          language === 'ar'
            ? `تم استخراج ${formatted.length} أسئلة بنجاح!`
            : `${formatted.length} questions extracted successfully!`,
          'success'
        );
      }

      setStagedFile(null);
    } catch (err) {
      console.error('[ExamCreation] Parsing error:', err);
      setParseError(err.message || 'An error occurred while parsing the file.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Add new question manually
  const addQuestion = (questionData) => {
    if (questionData) {
      setQuestions([
        ...questions,
        {
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: questionData.type || 'mcq',
          question: questionData.question || '',
          marks: Number(questionData.marks) || 1,
          options: questionData.options || ['', '', '', ''],
          correctAnswer: questionData.correctAnswer || '',
          correctAnswerIndex: questionData.correctAnswerIndex ?? null,
        },
      ]);
      return;
    }

    setQuestions([
      ...questions,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '',
        correctAnswerIndex: null,
        marks: 5,
      },
    ]);
  };

  // Update question
  const updateQuestion = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Replace full question object (used for Edit mode saves)
  const replaceQuestion = (id, updatedQuestionData) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updatedQuestionData } : q))
    );
  };

  // Update question option
  const updateQuestionOption = (questionId, optionIndex, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  // Delete question
  const deleteQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Clear all questions
  const clearQuestions = () => {
    setQuestions([]);
  };

  // Submit exam
  const handleSubmit = async () => {
    const backendQuestions = questions
      .filter((q) => q.question?.trim())
      .map(toBackendQuestion);

    const examData = {
      title: examTitle.trim(),
      description: examDescription.trim(),
      duration_minutes: parseInt(duration) || 30,
      total_marks: parseInt(totalMarks),
      passing_marks: parseInt(passingMarks),
      access_code: accessCode.trim(),
      questions: backendQuestions,
    };

    // Validate exam data
    const validation = examService.validateExam(examData);
    if (!validation.isValid) {
      throw new Error('Please fix the following errors:\n' + validation.errors.join('\n'));
    }

    try {
      const newExam = await examService.createExam(examData);
      resetForm();
      return true;
    } catch (error) {
      console.error('Exam creation error:', error);
      throw error;
    }
  };

  // Reset form
  const resetForm = () => {
    setExamTitle('');
    setExamDescription('');
    setAccessCode(generateAccessCode());
    setDuration('');
    setTotalMarks('');
    setPassingMarks('');
    setQuestions([]);
    setStagedFile(null);
    setParseError('');
    setCurrentStep(1);
    setStepErrors({});
    localStorage.removeItem('exam_draft');
  };

  return {
    // State
    examTitle,
    examDescription,
    accessCode,
    duration,
    totalMarks,
    passingMarks,
    questions,
    stagedFile,
    isParsingFile,
    parseError,
    currentStep,
    stepErrors,
    assignedMarks,

    // Actions
    nextStep,
    prevStep,
    setExamTitle,
    setExamDescription,
    setAccessCode,
    setDuration,
    setTotalMarks,
    setPassingMarks,
    handleFileStage,
    handleAbortUpload,
    handleExtractQuestions,
    addQuestion,
    updateQuestion,
    updateQuestionOption,
    replaceQuestion,
    deleteQuestion,
    clearQuestions,
    handleSubmit,
    resetForm,
  };
};
