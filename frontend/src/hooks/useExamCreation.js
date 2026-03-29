// Controller: useExamCreation Hook - Business logic for exam creation

import { useState } from 'react';
import { examService } from '../services/examService';
import { parseExamFileWithGemini } from '../services/geminiService';

export const useExamCreation = () => {
  const generateAccessCode = () => `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // State management
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [accessCode, setAccessCode] = useState(generateAccessCode());
  const [duration, setDuration] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [passingMarks, setPassingMarks] = useState('');
  const [questions, setQuestions] = useState([]);

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
    };
  };

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({});

  const nextStep = () => {
    if (currentStep === 1) {
      const errors = {};
      if (!examTitle.trim()) errors.examTitle = 'Title is required';
      if (!duration || parseInt(duration) <= 0) errors.duration = 'Valid duration is required';
      if (!totalMarks || parseInt(totalMarks) <= 0) errors.totalMarks = 'Valid total marks is required';
      if (!passingMarks || parseInt(passingMarks) <= 0) errors.passingMarks = 'Valid passing marks is required';
      if (parseInt(passingMarks) > parseInt(totalMarks)) errors.passingMarks = 'Passing marks cannot exceed total marks';

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

  // Gemini Integration
  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
  );

  const updateGeminiApiKey = (key) => {
    setGeminiApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('A');
  const [parsedData, setParsedData] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState('');

  // Handle file upload and parsing
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingFile(true);
    setParseError('');

    try {
      if (!geminiApiKey) {
        throw new Error('MISSING_API_KEY');
      }

      const aiQuestions = await parseExamFileWithGemini(file, geminiApiKey);

      // Calculate total marks from AI questions
      const normalizedQuestions = aiQuestions.map((q, index) => normalizeQuestion(q, index));
      const calculatedMarks = normalizedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

      setQuestions(normalizedQuestions);
      if (!examTitle) setExamTitle(`Exam from ${file.name}`);
      if (!totalMarks) setTotalMarks(calculatedMarks.toString());
      if (!passingMarks) setPassingMarks(Math.floor(calculatedMarks / 2).toString());

    } catch (error) {
      if (error.message === 'MISSING_API_KEY') {
        setParseError('Please enter your Google Gemini API Key to use AI extraction.');
      } else {
        setParseError(`Failed to parse file: ${error.message}`);
      }
      console.error('File parsing error:', error);
    } finally {
      setIsParsingFile(false);
      // Reset input so the same file can be selected again if needed
      if (event.target) event.target.value = '';
    }
  };

  // Load questions from selected model
  const loadQuestionsFromModel = (model, data = parsedData) => {
    if (!data?.models?.[model]) return;

    const modelQuestions = data.models[model];
    const formattedQuestions = modelQuestions.map((q, index) => normalizeQuestion(q, index));
    setQuestions(formattedQuestions);
    setSelectedModel(model);
  };

  // Add new question
  const addQuestion = (questionData) => {
    if (questionData) {
      setQuestions([
        ...questions,
        {
          id: `manual-${Date.now()}`,
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
        id: Date.now(),
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
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

  // Submit exam
  const handleSubmit = async () => {
    const examData = {
      title: examTitle.trim(),
      description: examDescription.trim(),
      duration_minutes: parseInt(duration) || 30,
      access_code: accessCode.trim(),
    };

    // Validate exam data
    const validation = examService.validateExam(examData);
    if (!validation.isValid) {
      alert('Please fix the following errors:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const newExam = await examService.createExam(examData);
      const backendQuestions = questions
        .filter((q) => q.question?.trim())
        .map(toBackendQuestion);

      if (backendQuestions.length > 0) {
        await examService.addQuestions(newExam.id, backendQuestions);
      }

      alert('Exam created successfully!');
      // Reset form
      resetForm();
      return true;
    } catch (error) {
      alert(`Failed to create exam: ${error.message}`);
      console.error('Exam creation error:', error);
      return false;
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
    setUploadedFile(null);
    setParsedData(null);
    setSelectedModel('A');
    setParseError('');
    setCurrentStep(1);
    setStepErrors({});
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
    uploadedFile,
    selectedModel,
    parsedData,
    isParsingFile,
    parseError,
    geminiApiKey,
    currentStep,
    stepErrors,

    // Actions
    updateGeminiApiKey,
    nextStep,
    prevStep,
    setExamTitle,
    setExamDescription,
    setAccessCode,
    setDuration,
    setTotalMarks,
    setPassingMarks,
    handleFileUpload,
    loadQuestionsFromModel,
    addQuestion,
    updateQuestion,
    updateQuestionOption,
    deleteQuestion,
    handleSubmit,
    resetForm,
  };
};
