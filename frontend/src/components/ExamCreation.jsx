// View Component - ExamCreation (following MVC pattern)
import { useState } from 'react'
import { useExamCreation } from '../hooks/useExamCreation'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'

function ExamCreation({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { showToast } = useToast()

  // Controller: Business logic from custom hook
  const {
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
    deleteQuestion,
    replaceQuestion,
    clearQuestions,
    handleSubmit,
    resetForm,
  } = useExamCreation()

  // Local UI state
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [showFormatGuide, setShowFormatGuide] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'mcq',
    question: '',
    marks: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    correctAnswerIndex: null
  })

  const areAllOptionsFilled = currentQuestion.options.every((option) => option.trim())

  const addNewQuestion = () => {
    if (
      currentQuestion.question.trim() &&
      currentQuestion.marks &&
      areAllOptionsFilled &&
      currentQuestion.correctAnswerIndex !== null
    ) {
      const preparedQuestion = {
        type: currentQuestion.type,
        question: currentQuestion.question,
        marks: Number(currentQuestion.marks),
        options: currentQuestion.options,
        correctAnswer: currentQuestion.options[currentQuestion.correctAnswerIndex] || '',
        correctAnswerIndex: currentQuestion.correctAnswerIndex,
      }

      if (editingQuestionId) {
        replaceQuestion(editingQuestionId, preparedQuestion)
      } else {
        addQuestion(preparedQuestion)
      }

      closeQuestionModal()
    }
  }

  const updateOption = (index, value) => {
    const newOptions = [...currentQuestion.options]
    newOptions[index] = value
    setCurrentQuestion({ ...currentQuestion, options: newOptions })
  }

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id)
    setCurrentQuestion({
      type: q.type || 'mcq',
      question: q.question || '',
      marks: String(q.marks || 1),
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer || '',
      correctAnswerIndex: q.correctAnswerIndex
    })
    setShowAddQuestion(true)
  }

  const closeQuestionModal = () => {
    setShowAddQuestion(false)
    setEditingQuestionId(null)
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      marks: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      correctAnswerIndex: null
    })
  }

  const handleClearAllQuestions = () => {
    setShowConfirmClear(true)
  }

  const confirmClearAllQuestions = () => {
    clearQuestions()
    setShowConfirmClear(false)
    showToast(language === 'ar' ? 'تم مسح جميع الأسئلة بنجاح.' : 'All questions cleared successfully.', 'info')
  }

  // UI Actions (delegated to controller)
  const handleCreateExam = async () => {
    try {
      const success = await handleSubmit()
      if (success) {
        showToast(
          language === 'ar' ? 'تم إنشاء الاختبار ونشره بنجاح!' : 'Exam created and published successfully!',
          'success'
        )
        onNavigate('examiner')
      } else {
        showToast(
          language === 'ar' ? 'فشل إنشاء الاختبار. يرجى مراجعة الأسئلة والمدخلات.' : 'Failed to create exam. Please review questions and inputs.',
          'error'
        )
      }
    } catch (err) {
      showToast(err.message || 'An error occurred while publishing the exam.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`relative w-12 h-12 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-cyan-500 via-purple-500 to-emerald-500 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] ${language === 'ar' ? 'ml-4' : 'mr-4'}`}>
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-2">
                <img src={logo} alt="Horus" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">{t('examiner.examCreation.title')}</h1>
              <p className="text-slate-400 text-sm">{t('examiner.examCreation.desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hidden sm:block"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            <button
              onClick={() => onNavigate('examiner')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white hover:-translate-y-0.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t('examiner.examCreation.backBtn')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Exam Details & Questions */}
          <div className="lg:col-span-2 space-y-6">

            {/* --- WIZARD PROGRESS BAR --- */}
            <div className={`flex items-center justify-between mb-8 relative ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-slate-800 -z-10 translate-y-[-50%]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / 2) * 100}%`, transformOrigin: language === 'ar' ? 'right' : 'left' }}
                ></div>
              </div>

              {[1, 2, 3].map(step => (
                <div key={step} className={`flex flex-col items-center gap-2 ${language === 'ar' ? 'text-right' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 border-2 ${currentStep >= step
                    ? 'bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}>
                    {currentStep > step ? (
                      <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${currentStep >= step ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                    {step === 1 ? (language === 'ar' ? 'الإعدادات' : 'Setup') :
                      step === 2 ? (language === 'ar' ? 'الأسئلة' : 'Questions') :
                        (language === 'ar' ? 'مراجعة' : 'Review')}
                  </span>
                </div>
              ))}
            </div>

            {/* --- STEP 1: EXAM SETUP --- */}
            {currentStep === 1 && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group animate-fade-in-up shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

                <div className={`flex items-center gap-3 mb-6 pb-4 border-b border-white/5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold">{t('examiner.examCreation.detailsTitle')}</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.examTitle')}</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder={t('examiner.examCreation.examTitlePlaceholder')}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.description')}</label>
                    <textarea
                      value={examDescription}
                      onChange={(e) => setExamDescription(e.target.value)}
                      placeholder={t('examiner.examCreation.descPlaceholder')}
                      rows="3"
                      className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none ${language === 'ar' ? 'text-right' : ''}`}
                    />
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${language === 'ar' ? 'text-right' : ''}`}>
                    <div>
                      <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{language === 'ar' ? 'رمز الدخول' : 'Access Code'}</label>
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                        placeholder="EX-ABC123"
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.duration')}</label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="60"
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border ${stepErrors.duration ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-cyan-500/50'} text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                      />
                      {stepErrors.duration && <p className="text-red-400 text-xs mt-1">{stepErrors.duration}</p>}
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.totalMarks')}</label>
                      <input
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(e.target.value)}
                        placeholder="100"
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border ${stepErrors.totalMarks ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-cyan-500/50'} text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                      />
                      {stepErrors.totalMarks && <p className="text-red-400 text-xs mt-1">{stepErrors.totalMarks}</p>}
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.passingMarks')}</label>
                      <input
                        type="number"
                        value={passingMarks}
                        onChange={(e) => setPassingMarks(e.target.value)}
                        placeholder="40"
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border ${stepErrors.passingMarks ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-cyan-500/50'} text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                      />
                      {stepErrors.passingMarks && <p className="text-red-400 text-xs mt-1">{stepErrors.passingMarks}</p>}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
                    <button
                      onClick={nextStep}
                      className={`px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] bg-gradient-to-r from-cyan-600 to-purple-600 flex items-center gap-2 hover:-translate-y-0.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      <span>{language === 'ar' ? 'التالي' : 'Next Step'}</span>
                      <svg className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 2: BUILD QUESTIONS --- */}
            {currentStep === 2 && (
              <div className="space-y-6">

                {/* Deterministic File Upload & Extraction */}
                <div className="pt-6 mt-6 border-t border-white/10 block">

                  {/* ── Format Guide Toggle ─────────────────────────────── */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowFormatGuide(prev => !prev)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-amber-400 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                          <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        <span className="text-xs font-bold tracking-widest uppercase">
                          {language === 'ar' ? 'دليل التنسيق' : 'Format Guide'}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform duration-300 ${showFormatGuide ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {showFormatGuide && (
                      <div className="mt-2 px-4 py-4 rounded-xl border border-amber-500/15 bg-amber-500/5 space-y-3 animate-fade-in-up">
                        <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                          <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            <span className="text-white font-semibold">{language === 'ar' ? 'اختيار من متعدد فقط: ' : 'MCQs Only: '}</span>
                            {language === 'ar' ? 'يجب أن تحتوي كل سؤال على 4 خيارات بالضبط.' : 'Questions must have exactly 4 choices.'}
                          </p>
                        </div>
                        <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                          <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            <span className="text-white font-semibold">{language === 'ar' ? 'خيار واحد في كل سطر: ' : 'One Choice Per Line: '}</span>
                            {language === 'ar' ? 'ضع خياراتك رأسيًا. التخطيطات الأفقية غير مدعومة.' : 'Vertically stack your choices. Horizontal layouts are not supported.'}
                          </p>
                        </div>
                        <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                          <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            <span className="text-white font-semibold">{language === 'ar' ? 'غمّق الإجابة: ' : 'Bold the Answer: '}</span>
                            {language === 'ar' ? 'يجب أن يكون الخيار الصحيح بخط عريض للكشف التلقائي.' : 'The correct option must be bolded for auto-detection.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* ── End Format Guide ────────────────────────────────── */}

                  {!stagedFile ? (
                    <div>
                      <label className="cursor-pointer">
                        <div className="border border-dashed border-cyan-500/30 rounded-xl p-8 hover:bg-cyan-500/5 hover:border-cyan-500/50 transition-all text-center group bg-slate-950/30">
                          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </div>
                          <p className="text-slate-300 text-sm font-semibold mb-2">
                            {language === 'ar' ? 'انقر لتحميل ملف الامتحان' : 'Click to upload exam file'}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {language === 'ar'
                              ? 'PDF, DOC, or DOCX • حدد الإجابة الصحيحة بالخط العريض (Bold) في مستندك'
                              : 'PDF, DOC, or DOCX • Bold the correct answer in your document'}
                          </p>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileStage}
                          className="hidden"
                          disabled={isParsingFile}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4 shadow-lg">
                      <div className={`bg-slate-950/40 border border-white/10 rounded-xl p-4 flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold tracking-tight">{stagedFile.name}</p>
                            <p className="text-slate-400 text-xs mt-1 font-medium">
                              {(stagedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isParsingFile ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-semibold text-xs border border-cyan-500/20">
                              <svg className="w-4 h-4 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M22 12a10 10 0 0 1-10 10" />
                              </svg>
                              <span>{language === 'ar' ? 'جاري الاستخراج...' : 'Extracting...'}</span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={handleAbortUpload}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              >
                                {language === 'ar' ? 'إلغاء' : 'Abort'}
                              </button>
                              <button
                                onClick={() => handleExtractQuestions(showToast, t, language)}
                                disabled={parseError !== ''}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {language === 'ar' ? 'استخراج الأسئلة' : 'Extract Questions'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {parseError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
                          <svg className="w-5 h-5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <div className="flex-1 text-red-300 text-sm font-medium">
                            {parseError}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Questions List */}
            {currentStep === 2 && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

                <div className={`flex items-center justify-between mb-6 pb-4 border-b border-white/5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <h2 className={`text-white text-lg font-bold flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    {language === 'ar' ? `الأسئلة (${questions.length})` : `Questions (${questions.length})`}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold hidden sm:inline-block px-3 py-1 rounded-lg border ${
                      assignedMarks === parseInt(totalMarks)
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : assignedMarks > parseInt(totalMarks)
                          ? 'text-red-400 bg-red-500/10 border-red-500/30'
                          : 'text-slate-400 bg-white/5 border-white/10'
                    }`}>
                      {language === 'ar'
                        ? `المجموع: ${assignedMarks} / ${totalMarks}`
                        : `Assigned: ${assignedMarks} / ${totalMarks}`}
                    </span>
                    {questions.length > 0 && (
                      <button
                        onClick={handleClearAllQuestions}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 text-red-400 hover:-translate-y-0.5 active:scale-95 shrink-0"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>{language === 'ar' ? 'مسح الأسئلة' : 'Clear All'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddQuestion(true)}
                      className={`relative group px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 shrink-0 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                      <svg className="w-4 h-4 relative z-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span className="relative z-10 text-white">{language === 'ar' ? 'إضافة سؤال' : 'Add Question'}</span>
                    </button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium">{language === 'ar' ? 'لم يتم إضافة أسئلة بعد.' : 'No questions added yet.'}</p>
                    <p className="text-slate-500 text-sm mt-1">{language === 'ar' ? 'انقر على "إضافة سؤال" لبدء بناء اختبارك.' : 'Click "Add Question" to start building your exam.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => {
                      const isMissingAnswer = q.correctAnswerIndex === null;
                      const hasInsufficientChoices = q.options.length < 4;
                      return (
                        <div key={q.id} className={`border rounded-xl p-5 transition group ${
                          hasInsufficientChoices
                            ? 'border-red-500/50 bg-red-500/5 hover:border-red-500/70'
                            : isMissingAnswer
                              ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500/70'
                              : 'bg-slate-950/40 border-white/10 hover:border-white/20'
                        }`}>
                          <div className={`flex items-start justify-between gap-4 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                            <div className="flex-1">
                              <div className={`flex items-center gap-3 mb-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <span className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold tracking-widest uppercase">Q{index + 1}</span>
                                <span className="bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">
                                  {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'essay' ? 'Essay' : 'True/False'}
                                </span>
                                <span className="text-purple-400 text-xs font-bold tracking-widest uppercase bg-purple-500/10 px-3 py-1 rounded border border-purple-500/20">{q.marks} marks</span>
                                {isMissingAnswer && (
                                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase animate-pulse">
                                    ⚠ {language === 'ar' ? 'إجابة مفقودة' : 'Missing Answer'}
                                  </span>
                                )}
                                {hasInsufficientChoices && (
                                  <span className="bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase animate-pulse">
                                    ⚠ {language === 'ar' ? 'خيارات ناقصة' : 'Incomplete Choices'}
                                  </span>
                                )}
                              </div>
                              <p className="text-white text-base font-medium mb-4 leading-relaxed">{q.question}</p>

                              {q.type === 'mcq' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((option, i) => (
                                    <div key={i} className={`flex items-center p-3 rounded-lg border ${q.correctAnswerIndex === i ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'} ${language === 'ar' ? 'flex-row-reverse gap-3' : 'gap-3'}`}>
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${q.correctAnswerIndex === i ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-600 bg-slate-900/50'
                                        }`}>
                                        {q.correctAnswerIndex === i && (
                                          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                        )}
                                      </div>
                                      <span className={`text-sm ${q.correctAnswerIndex === i ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                                        {option}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {q.type === 'truefalse' && (
                                <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                  <span className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors ${q.correctAnswer === 'true' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 border border-white/10 text-slate-400'
                                    }`}>True</span>
                                  <span className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-colors ${q.correctAnswer === 'false' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 border border-white/10 text-slate-400'
                                    }`}>False</span>
                                </div>
                              )}

                              {q.type === 'essay' && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 inline-flex items-center gap-2">
                                  <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  <span className="text-yellow-400/80 text-xs font-semibold uppercase tracking-wider">Manual grading required</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all shrink-0">
                              <button
                                onClick={() => handleEditQuestion(q)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all"
                                title={language === 'ar' ? 'تعديل السؤال' : 'Edit Question'}
                              >
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => deleteQuestion(q.id)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                                title={language === 'ar' ? 'حذف السؤال' : 'Delete Question'}
                              >
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pt-6 mt-6 border-t border-white/5 flex flex-col gap-4">
                  {stepErrors.questions && (
                    <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {stepErrors.questions}
                    </div>
                  )}
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={prevStep}
                      className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 border border-white/10 hover:bg-white/5 hover:border-white/20 text-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      {language === 'ar' ? 'السابق' : 'Back Step'}
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={
                        questions.length === 0 ||
                        assignedMarks !== parseInt(totalMarks) ||
                        questions.some(q => q.options.length < 4) ||
                        questions.some(q => q.correctAnswerIndex === null)
                      }
                      className={`px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] bg-gradient-to-r from-cyan-600 to-purple-600 flex items-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                    >
                      <span>{language === 'ar' ? 'التالي' : 'Next Step'}</span>
                      <svg className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* --- STEP 3: REVIEW & PUBLISH --- */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

                <div className={`flex items-center gap-3 mb-6 pb-4 border-b border-white/5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold">{t('examiner.examCreation.summary.title') || 'Review Exam'}</h3>
                </div>

                <div className={`space-y-4 text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                  <div className={`flex justify-between items-center bg-slate-950/40 border border-white/5 px-4 py-3 rounded-xl ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">{t('examiner.examCreation.summary.totalQs') || 'Total Questions'}</span>
                    <span className="text-white font-bold">{questions.length}</span>
                  </div>
                  <div className={`flex justify-between items-center bg-slate-950/40 border border-white/5 px-4 py-3 rounded-xl ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">{t('examiner.examCreation.summary.calcMarks') || 'Calculated Marks'}</span>
                    <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{questions.reduce((sum, q) => sum + Number(q.marks), 0)}</span>
                  </div>
                  <div className={`flex justify-between items-center bg-slate-950/40 border border-white/5 px-4 py-3 rounded-xl ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">{t('examiner.examCreation.summary.reqMarks') || 'Required Marks'}</span>
                    <span className="text-white font-bold">{totalMarks || '0'}</span>
                  </div>

                  {questions.reduce((sum, q) => sum + Number(q.marks), 0) !== Number(totalMarks) && (
                    <div className={`p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs leading-relaxed font-medium flex items-start gap-3 mt-4 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      {t('examiner.examCreation.summary.markWarning') || 'Warning: Calculated marks do not match Total Marks.'}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-4 pt-6 border-t border-white/5">
                  <button
                    onClick={prevStep}
                    className={`px-6 py-4 rounded-xl font-bold transition-all duration-300 border border-white/10 hover:bg-white/5 hover:border-white/20 text-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                  >
                    {language === 'ar' ? 'السابق' : 'Back'}
                  </button>
                  <button
                    onClick={handleCreateExam}
                    disabled={questions.length === 0}
                    className="flex-1 relative group px-6 py-4 rounded-xl font-bold text-base text-white transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none bg-gradient-to-r from-cyan-600 to-purple-600"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {t('examiner.examCreation.summary.createBtn') || 'Publish Exam'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Section - Progress Summary Panel (Only shows on larger screens) */}
        <div className="space-y-6 hidden lg:block">
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6 backdrop-blur-md sticky top-24 shadow-2xl">
            <h3 className={`text-white text-lg font-bold mb-6 pb-4 border-b border-white/5 ${language === 'ar' ? 'text-right' : ''}`}>
              {language === 'ar' ? 'ملخص التقدم' : 'Progress'}
            </h3>

            <div className="space-y-4">
              <div className={`rounded-xl border p-4 transition-all duration-300 ${currentStep > 1 ? 'border-cyan-500/30 bg-cyan-500/5' : currentStep === 1 ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/10 bg-slate-800/40'}`}>
                <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${currentStep > 1 ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : currentStep === 1 ? 'border-cyan-400 bg-cyan-600 text-white' : 'border-white/10 bg-slate-800 text-slate-400'}`}>
                    {currentStep > 1 ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      '1'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100">{language === 'ar' ? 'إعدادات الاختبار' : 'Exam Settings'}</div>
                    <div className="text-xs mt-1">
                      {examTitle ? (
                        <span className="text-cyan-400">{language === 'ar' ? 'مكتمل' : 'Completed'}</span>
                      ) : (
                        <span className="text-slate-400">{language === 'ar' ? 'غير مكتمل' : 'Incomplete'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 transition-all duration-300 ${currentStep > 2 ? 'border-cyan-500/30 bg-cyan-500/5' : currentStep === 2 ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/10 bg-slate-800/40'}`}>
                <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${currentStep > 2 ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : currentStep === 2 ? 'border-cyan-400 bg-cyan-600 text-white' : 'border-white/10 bg-slate-800 text-slate-400'}`}>
                    {currentStep > 2 ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      '2'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100">{language === 'ar' ? 'الأسئلة' : 'Questions'}</div>
                    <div className="text-xs mt-1">
                      {questions.length > 0 ? (
                        <span className="text-cyan-400">
                          {language === 'ar' ? `تمت إضافة ${questions.length}` : `${questions.length} Added`}
                        </span>
                      ) : (
                        <span className="text-slate-400">{language === 'ar' ? 'غير مكتمل' : 'Incomplete'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 transition-all duration-300 ${currentStep === 3 ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/10 bg-slate-800/40'}`}>
                <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${currentStep === 3 ? 'border-cyan-400 bg-cyan-600 text-white' : 'border-white/10 bg-slate-800 text-slate-400'}`}>
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-100">{language === 'ar' ? 'مراجعة ونشر' : 'Review & Publish'}</div>
                    <div className="text-xs mt-1">
                      <span className="text-slate-400">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Manual question add/edit modal drawer */}
      {
        showAddQuestion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeQuestionModal}></div>
            <div className={`bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-fade-in-up ${language === 'ar' ? 'text-right' : ''}`}>

              <div className={`flex items-center justify-between mb-6 pb-4 border-b border-white/5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-white text-lg font-bold">
                  {editingQuestionId 
                    ? (language === 'ar' ? 'تعديل السؤال' : 'Edit Question') 
                    : t('examiner.examCreation.addQuestion.title')}
                </h3>
                <button
                  onClick={closeQuestionModal}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.addQuestion.questionText')}</label>
                  <textarea
                    value={currentQuestion.question}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none ${language === 'ar' ? 'text-right' : ''}`}
                    rows="3"
                    placeholder={t('examiner.examCreation.addQuestion.questionPlaceholder')}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.addQuestion.marks')}</label>
                  <input
                    type="number"
                    value={currentQuestion.marks}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2 ${language === 'ar' ? 'text-right' : ''}`}>{t('examiner.examCreation.addQuestion.options')}</label>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="radio"
                          name="correctAnswer"
                          className="w-4 h-4 text-purple-500 focus:ring-purple-500/50 border-white/20 bg-slate-950/50"
                          checked={currentQuestion.correctAnswerIndex === index}
                          onChange={() => setCurrentQuestion({
                            ...currentQuestion,
                            correctAnswerIndex: index,
                            correctAnswer: option
                          })}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className={`flex-1 px-4 py-2.5 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all ${language === 'ar' ? 'text-right' : ''}`}
                          placeholder={`${t('examiner.examCreation.addQuestion.optionPlaceholder')} ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`mt-6 pt-6 border-t border-white/5 flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={closeQuestionModal}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {t('examiner.examCreation.addQuestion.cancelBtn')}
                  </button>
                  <button
                    onClick={addNewQuestion}
                    disabled={!currentQuestion.question.trim() || !currentQuestion.marks || currentQuestion.correctAnswerIndex === null || !areAllOptionsFilled}
                    className="flex-1 px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-600 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <span className="relative z-10">
                      {editingQuestionId 
                        ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') 
                        : t('examiner.examCreation.addQuestion.addBtn')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* ── Custom Glassmorphic Clear Questions Confirmation Overlay ── */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="relative w-full max-w-md animate-zoom-in">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-red-500/30 via-orange-500/25 to-purple-500/30 blur-xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
              <div className="h-[2px] w-full bg-gradient-to-r from-red-500 via-orange-500 to-purple-500" />

              <div className="p-8 text-center">
                {/* Warning Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 animate-pulse">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-white text-xl font-bold mb-2">
                  {language === 'ar' ? 'مسح جميع الأسئلة؟' : 'Clear All Questions?'}
                </h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  {language === 'ar' 
                    ? 'هل أنت متأكد من مسح جميع الأسئلة؟ لا يمكن التراجع عن هذا الإجراء.' 
                    : 'Are you sure you want to clear all questions? This action cannot be undone.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    onClick={confirmClearAllQuestions}
                    className="w-full relative group py-3 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg hover:shadow-red-500/20"
                    style={{ boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2" />
                      </svg>
                      {language === 'ar' ? 'مسح الأسئلة' : 'Clear All'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamCreation
