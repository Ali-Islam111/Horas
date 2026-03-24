import { useEffect, useState } from 'react'
import bgArt from '../../assets/logo.png'
import { useLanguage } from '../contexts/LanguageContext'

function ExamSubmission({ onNavigate, examController }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { state } = examController
  const { result, currentExam, answers, session } = state
  const [showConfetti, setShowConfetti] = useState(true)

  const percentage = Number(result?.score ?? session?.final_score ?? 0)
  const score = Math.round(percentage)
  const total = 100
  const effectiveAnswers = Object.keys(answers || {}).length > 0 ? answers : (session?.student_answers || {})
  const answeredCount = Object.keys(effectiveAnswers).length
  
  // Calculate Grade
  const getGrade = (p) => {
    if (p >= 90) return 'A+'
    if (p >= 85) return 'A'
    if (p >= 80) return 'B+'
    if (p >= 75) return 'B'
    if (p >= 70) return 'C+'
    if (p >= 60) return 'C'
    if (p >= 50) return 'D'
    return 'F'
  }
  const grade = getGrade(percentage)

  useEffect(() => {
    // Hide confetti animation after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30 flex items-center justify-center p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Decorative Background Art */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl opacity-[0.03] pointer-events-none z-0">
        <img src={bgArt} alt="" className="w-full h-auto object-cover blur-[2px]" />
      </div>

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                backgroundColor: ['#06B6D4', '#A855F7', '#34D399', '#3B82F6', '#F472B6'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                boxShadow: '0 0 10px currentColor'
              }}
            />
          ))}
        </div>
      )}

      {/* Language Toggle Button - Absolute Top Right */}
      <div className={`absolute top-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-50 hidden sm:block`}>
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md"
        >
          {language === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {/* Success Card */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center relative z-10 animate-fade-in-up">

        {/* Glow behind card */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-3xl pointer-events-none"></div>

        {/* Success Icon */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-110 animate-pulse"></div>
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.5)] animate-scale-in relative z-10">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-md">
          {t('student.submission.title')}
        </h1>

        {/* Message */}
        <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          {t('student.submission.message')}
        </p>

        {/* Score Display (If auto-graded) */}
        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-8 mb-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>

          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4">{t('student.submission.estScore')}</p>
          <div className={`flex items-center justify-center gap-6 mb-5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              {score}
            </div>
            <div className={`text-left flex flex-col justify-center ${language === 'ar' ? 'border-r pr-6' : 'border-l pl-6'} border-white/10`}>
              <p className="text-3xl font-bold text-slate-500">/ {total}</p>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold inline-block mt-2 tracking-widest text-center">
                {grade}
              </div>
            </div>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className={`h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-[2000ms] shadow-[0_0_10px_rgba(52,211,153,0.8)] ${language === 'ar' ? 'ml-auto float-right' : ''}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-emerald-400 font-semibold text-sm mt-4 tracking-wide">
            {percentage >= 90 ? t('student.submission.feedbackExcellent') : percentage >= 80 ? t('student.submission.feedbackGreat') : percentage >= 70 ? t('student.submission.feedbackGood') : percentage >= 60 ? t('student.submission.feedbackPassed') : t('student.submission.feedbackKeepPracticing')}
          </p>
        </div>

        {/* Exam Details Row */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          {[
            { labelKey: 'examLabel', val: currentExam?.title || 'Exam', icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> },
            { labelKey: 'timeLabel', val: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
            { labelKey: 'answeredLabel', val: `${answeredCount}`, icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> },
            { labelKey: 'dateLabel', val: new Date().toLocaleDateString(), icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></> }
          ].map((dt, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-colors">
              <svg className="w-5 h-5 text-slate-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {dt.labelKey === 'examLabel' ? <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> :
                  dt.labelKey === 'timeLabel' ? <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> :
                    dt.labelKey === 'answeredLabel' ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> :
                      <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
              </svg>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{t(`student.submission.${dt.labelKey}`)}</p>
              <p className="text-white text-sm font-semibold truncate">{dt.val}</p>
            </div>
          ))}
        </div>

        {/* Security Notification */}
        <div className={`bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-5 mb-8 flex items-start gap-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-cyan-400 font-bold mb-1 text-sm tracking-wide">{t('student.submission.securityVerify')}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{t('student.submission.securityVerifyDesc')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto relative group px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 overflow-hidden border border-emerald-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10">{t('student.submission.returnDash')}</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          >
            {t('student.submission.reviewSub')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-fall {
          animation: fall linear forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}

export default ExamSubmission
