import { useState, useEffect, useRef } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { connectProctoringWS } from '../services/proctoringService'
import { useToast } from '../contexts/ToastContext'
import AIInitializingScreen from './AIInitializingScreen'

function StudentExam({ onNavigate, examController }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { showToast } = useToast()
  const { state, actions } = examController
  const { questions, currentExam, session, answers, isLoading } = state
  const { handleAnswer, handleSubmitExam } = actions

  const [timeRemaining, setTimeRemaining] = useState({ hours: 1, minutes: 0, seconds: 0 })
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [cameraStatus, setCameraStatus] = useState('checking')
  const [microphoneStatus, setMicrophoneStatus] = useState('checking')
  const [apiStatus, setApiStatus] = useState('Initializing')
  const [aiReady, setAiReady] = useState(false)
  const [aiState, setAiState] = useState('waiting')
  const sidebarVideoRef = useRef(null)
  const streamRef = useRef(null)
  const wsRef = useRef(null)
  const frameIntervalRef = useRef(null)
  

  const sessionId = session?.id || localStorage.getItem('current_session_id') || localStorage.getItem('session_id')

  // Timer countdown
  useEffect(() => {
    if (!aiReady) {
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        let { hours, minutes, seconds } = prev

        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else {
          // Time's up - auto submit
          clearInterval(timer)
          return { hours: 0, minutes: 0, seconds: 0 }
        }

        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [aiReady])

  // Check camera and microphone permissions and start video stream
  useEffect(() => {
    let audioStream = null

    const attachStreamToVideo = async (videoElement, stream) => {
      if (!videoElement || !stream) return

      videoElement.srcObject = stream
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(() => {})
          resolve()
        }
      })
    }

    const startMediaDevices = async () => {
      console.log('🎬 [STUDENT EXAM] Requesting camera and microphone permissions...')

      // Request camera
      try {
        console.log('📷 [STUDENT EXAM] Starting camera...')
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        })
        streamRef.current = videoStream

        await attachStreamToVideo(sidebarVideoRef.current, videoStream)

        setCameraStatus('active')
        console.log('✅ [STUDENT EXAM] Camera activated successfully')
      } catch (err) {
        console.error('❌ [STUDENT EXAM] Camera error:', err.name, err.message)
        setCameraStatus('inactive')

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          showToast('Camera permission denied! Please allow camera access in your browser settings and refresh the page.', 'error');
        } else if (err.name === 'NotFoundError') {
          showToast('No camera found! Please connect a camera and refresh the page.', 'warning');
        }
      }

      // Request microphone
      try {
        console.log('🎤 [STUDENT EXAM] Starting microphone...')
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setMicrophoneStatus('active')
        console.log('✅ [STUDENT EXAM] Microphone activated successfully')
      } catch (err) {
        console.error('❌ [STUDENT EXAM] Microphone error:', err.name, err.message)
        setMicrophoneStatus('inactive')

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          showToast('Microphone permission denied! Please allow microphone access in your browser settings and refresh the page.', 'error');
        } else if (err.name === 'NotFoundError') {
          showToast('No microphone found! Please connect a microphone and refresh the page.', 'warning');
        }
      }

      // Set API status based on media availability
      if (streamRef.current) {
        setApiStatus('Camera Ready')
        console.log('🚀 [STUDENT EXAM] Camera ready for AI proctoring')
      } else {
        setApiStatus('Error')
        console.log('❌ [STUDENT EXAM] AI Monitoring unavailable - no media devices active')
      }
    }

    startMediaDevices()

    // Cleanup: Stop all media streams when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 [STUDENT EXAM] Camera stream stopped')
        })
        streamRef.current = null
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 [STUDENT EXAM] Audio stream stopped')
        })
      }
      clearInterval(frameIntervalRef.current)
      wsRef.current?.close()
    }
  }, [])

  // Connect to the real AI WebSocket and stream frames every 1 second
  useEffect(() => {
    if (cameraStatus !== 'active') {
      return
    }

    if (!sessionId) {
      setApiStatus('No Session')
      console.warn('[STUDENT EXAM] No active session ID found for AI proctoring')
      return
    }

    setApiStatus('Connecting')
    console.log(`🎥 [STUDENT EXAM] Connecting AI proctoring WebSocket for session ${sessionId}...`)

    wsRef.current = connectProctoringWS(sessionId, {
      onOpen: () => {
        setApiStatus('Connected')
        frameIntervalRef.current = setInterval(() => {
          const videoElement = sidebarVideoRef.current
          // Ensure video is playing and has data before capturing frames
          if (!videoElement || !wsRef.current || videoElement.readyState < 2) {
            return
          }

          wsRef.current.sendFrame(videoElement, 0.7)
          setApiStatus('Streaming')
        }, 350)
      },
      onReady: () => {
        setAiState('ready')
        setAiReady(true)
        setApiStatus('AI Ready')
      },
      onAlert: (alertData) => {
        console.warn('[STUDENT EXAM] AI alert received:', alertData)
      },
      onClose: () => {
        clearInterval(frameIntervalRef.current)
        setApiStatus('Disconnected')
      },
      onError: () => {
        clearInterval(frameIntervalRef.current)
        setApiStatus('Error')
      },
    })

    return () => {
      clearInterval(frameIntervalRef.current)
      wsRef.current?.close()
      wsRef.current = null
      console.log('⏹️ [STUDENT EXAM] Stopped AI WebSocket monitoring')
    }
  }, [cameraStatus, sessionId])

  

  const formatTime = (time) => {
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`
  }

  const totalQuestions = questions.length || 0
  const currentQ = questions[currentQuestion - 1] || null
  const answeredCount = Object.keys(answers).length

  /** Advance to next question; if last, jump to submit */
  const goNext = () => {
    if (currentQuestion < totalQuestions) setCurrentQuestion(q => q + 1)
  }
  const goPrev = () => {
    if (currentQuestion > 1) setCurrentQuestion(q => q - 1)
  }

  const onSubmit = () => {
    setShowSubmitModal(true)
  }

  const confirmSubmit = async () => {
    setShowSubmitModal(false)
    try {
      const submitResult = await handleSubmitExam()
      if (submitResult) {
        onNavigate('examSubmission')
      }
    } catch (submitError) {
      showToast(submitError?.message || 'Failed to submit exam. Please try again.', 'error');
    }
  }

  const unansweredCount = totalQuestions - answeredCount

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30 font-sans">

      {/* ── AI Initialization Overlay ── */}
      {!aiReady && (
        <div className="absolute inset-0 z-[1000] bg-[#030014]">
          <AIInitializingScreen state={aiState} />
        </div>
      )}
      
      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSubmitModal(false)}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-md animate-zoom-in-down">
            {/* Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-emerald-500/30 via-cyan-500/20 to-purple-500/30 blur-xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
              {/* Top accent bar */}
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400" />

              <div className="p-8">
                {/* Icon */}
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-center text-white text-xl font-bold mb-2 tracking-tight">
                  {t('student.exam.confirmSubmit') || 'Submit Your Exam?'}
                </h2>
                <p className="text-center text-slate-400 text-sm mb-6">
                  Once submitted, you cannot change your answers.
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{answeredCount}</div>
                    <div className="text-xs text-slate-400 font-medium mt-1">Answered</div>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${unansweredCount > 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/5 border-white/8'}`}>
                    <div className={`text-2xl font-bold ${unansweredCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{unansweredCount}</div>
                    <div className="text-xs text-slate-400 font-medium mt-1">Unanswered</div>
                  </div>
                </div>

                {/* Warning for unanswered */}
                {unansweredCount > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-6">
                    <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-amber-300 text-xs leading-relaxed">
                      You have <span className="font-bold text-amber-400">{unansweredCount}</span> unanswered {unansweredCount === 1 ? 'question' : 'questions'}. Skipped questions will be marked as incorrect.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Keep Reviewing
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 relative group py-3 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg hover:shadow-emerald-500/30"
                    style={{ boxShadow: '0 0 25px rgba(16,185,129,0.3)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Submit Exam
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Top Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-cyan-500 via-purple-500 to-emerald-500 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-2">
                <img src={logo} alt="Horus" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">{currentExam?.title || 'Exam'}</h1>
              <p className="text-slate-400 text-sm">{t('student.exam.sessionActive')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hidden sm:block"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 flex items-center gap-3 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
              <span className="text-red-400 text-sm font-bold tracking-widest uppercase">{t('student.exam.recordingBadge')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">

        {/* Main Exam Content Area */}
        <div className="flex-1 flex flex-col space-y-6">

          {/* Status Bar */}
          <div className="flex flex-wrap gap-4 animate-fade-in-up">
            {/* Time Remaining */}
            <div className="rounded-xl border border-white/5 bg-white/5 backdrop-blur-md px-5 py-3 flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('student.exam.timeRemaining')}</span>
                <span className="text-white font-mono font-bold text-lg leading-none" style={{ direction: 'ltr' }}>{formatTime(timeRemaining)}</span>
              </div>
            </div>

            {/* Question Counter */}
            <div className="rounded-xl border border-white/5 bg-white/5 backdrop-blur-md px-5 py-3 flex items-center gap-3 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('student.exam.progress')}</span>
                <span className="text-white font-mono font-bold text-lg leading-none">{currentQuestion} <span className="text-slate-500 text-sm">/ {totalQuestions}</span></span>
              </div>
            </div>

            {/* Auto-save */}
            <div className={`rounded-xl border border-white/5 bg-white/5 backdrop-blur-md px-5 py-3 flex items-center gap-3 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`}>
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></div>
              <span className="text-slate-300 text-sm font-medium">{t('student.exam.autoSaved')}</span>
            </div>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl p-8 relative overflow-hidden group flex-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

            {/* Question Header */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <span className="font-bold text-xl">{currentQuestion}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest block mb-1">{t('student.exam.multipleChoice')}</span>
                <span className="text-white text-sm font-medium">{t('student.exam.topicPrefix')} Cellular Biology</span>
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-white text-2xl font-medium mb-10 leading-relaxed max-w-4xl tracking-tight">
              {currentQ ? currentQ.question_text : 'Loading question...'}
            </h2>

            {/* Answer Options */}
            <div className="space-y-4 max-w-4xl">
              {currentQ && (currentQ.choice || []).filter(Boolean).map((option, index) => {
                const choiceLetter = String.fromCharCode(65 + index) // A, B, C, D
                const isSelected = answers[String(currentQ.id)] === option
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(currentQ.id, option)}
                    className={`w-full p-5 rounded-xl flex items-start sm:items-center gap-5 transition-all duration-300 text-left ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    } border`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 transition-colors duration-300 ${
                      isSelected ? 'border-cyan-400 bg-cyan-500/30' : 'border-slate-500 bg-slate-900/50'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
                    </div>
                    <span className="font-medium sm:text-lg leading-snug">{choiceLetter}) {option}</span>
                  </button>
                )
              })}
              {!currentQ && (
                <div className="text-slate-400 text-center py-8">No questions loaded. Please go back to the dashboard.</div>
              )}
            </div>
          </div>

          {/* Navigation Area */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex w-full sm:w-auto gap-3">
              <button
                onClick={goPrev}
                disabled={currentQuestion === 1}
                className="flex-1 sm:flex-none bg-slate-900 border border-white/10 rounded-xl px-6 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                {t('student.exam.prevBtn')}
              </button>
              <button
                onClick={goNext}
                disabled={currentQuestion === totalQuestions}
                className="flex-1 sm:flex-none relative group px-6 py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 overflow-hidden border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center gap-2">
                  {t('student.exam.nextBtn')}
                  <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </button>
            </div>

            <button
              onClick={onSubmit}
              disabled={isLoading || totalQuestions === 0 || currentQuestion !== totalQuestions}
              className={`w-full sm:w-auto relative group px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 overflow-hidden border border-emerald-500/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                )}
                {isLoading ? t('student.auth.login.loading') : t('student.exam.submitBtn')}
              </span>
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:w-80 flex flex-col space-y-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>

          {/* Live Camera Feed */}
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-sm tracking-wide uppercase">{t('student.exam.proctoringFeed')}</h3>
              {cameraStatus === 'active' && <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wider">{t('student.exam.liveStatus')}</div>}
            </div>
            <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <video
                ref={sidebarVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-500 ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
              />
              {cameraStatus !== 'active' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 animate-pulse">
                    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span className="text-slate-400 text-xs font-semibold">{cameraStatus === 'checking' ? t('student.exam.initCamera') : t('student.exam.cameraDisconnected')}</span>
                </div>
              )}
              {/* Overlay HUD lines just for high-tech effect */}
              <div className="absolute inset-0 border-[1px] border-cyan-500/20 hidden lg:block pointer-events-none mix-blend-screen mix-blend-screen opacity-50 z-20"></div>
            </div>
          </div>

          {/* Question Navigator Grid */}
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 shadow-lg flex-1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <h3 className="text-white font-bold text-sm tracking-wide uppercase">{t('student.exam.navigator')}</h3>
              <span className="text-slate-400 text-xs font-mono">{answeredCount}/{totalQuestions}</span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto pr-2 no-scrollbar">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i + 1)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 border ${currentQuestion === i + 1
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : (questions[i] && answers[String(questions[i].id)])
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 shadow-lg">
            <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-4 pb-3 border-b border-white/5">{t('student.exam.diagnostics')}</h3>
            <div className="space-y-3">
              {[
                { label: t('student.exam.cameraFeedCheck'), status: cameraStatus === 'active' ? t('student.exam.activeStatus') : t('student.exam.errorStatus'), active: cameraStatus === 'active' },
                { label: t('student.exam.micCheck'), status: microphoneStatus === 'active' ? t('student.exam.activeStatus') : t('student.exam.errorStatus'), active: microphoneStatus === 'active' },
                { label: t('student.exam.screenCheck'), status: t('student.exam.activeStatus'), active: true },
                { label: t('student.exam.networkCheck'), status: t('student.exam.networkStable'), active: true },
                { label: t('student.exam.aiMonitorCheck'), status: apiStatus, active: ['Connected', 'AI Ready', 'Streaming', 'Connecting'].includes(apiStatus) }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${item.active ? 'bg-emerald-400 text-emerald-400' : 'bg-red-500 text-red-500 animate-pulse'}`}></div>
                    <span className="text-slate-300 text-xs font-medium">{item.label}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${item.active ? 'text-emerald-400' : 'text-red-400'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default StudentExam
