import { useState, useEffect } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { API_BASE_URL } from '../config/api'
import { sessionService } from '../services/sessionService'

function StudentDashboard({ onNavigate, examController }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { state, actions } = examController
  const { exams, isLoading, error } = state
  const { handleEnrollExam } = actions
  const [currentUser, setCurrentUser] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 56, seconds: 23 })

  useEffect(() => {
    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const data = await sessionService.getMySubmissions()
        setSubmissions(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch submissions:', err)
        setSubmissions([])
      }
    }

    fetchSubmissions()
  }, [])

  useEffect(() => {
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
        }

        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (time) => {
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`
  }

  const getExamProgress = (examId) => {
    const matchedSubmission = submissions
      .filter((submission) => submission.exam_id === examId)
      .sort((a, b) => new Date(b.submitted_at || b.started_at) - new Date(a.submitted_at || a.started_at))[0]

    if (!matchedSubmission) {
      return {
        status: 'available',
        label: language === 'ar' ? 'متاح' : 'Available',
        buttonLabel: t('student.dashboard.startExamBtn'),
      }
    }

    if (matchedSubmission.status === 'completed' || matchedSubmission.final_score !== null && matchedSubmission.final_score !== undefined) {
      return {
        status: 'completed',
        label: language === 'ar' ? 'تم التسليم' : 'Submitted',
        buttonLabel: t('student.submission.reviewSub'),
      }
    }

    return {
      status: 'in_progress',
      label: language === 'ar' ? 'قيد التقدم' : 'In Progress',
      buttonLabel: language === 'ar' ? 'متابعة الامتحان' : 'Continue Exam',
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
              <h1 className="text-white text-xl font-bold tracking-tight">{t('landing.horusTitle')}</h1>
              <p className="text-slate-400 text-sm">{t('student.dashboard.portal')}</p>
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
            <button
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white hover:-translate-y-0.5"
            >
              <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('student.dashboard.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">

        {/* Welcome Message */}
        <div className="animate-fade-in-up">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-1 tracking-tight">{t('student.dashboard.welcomeBack')} {currentUser?.full_name || '...'}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('student.dashboard.upcomingExamsCount').replace('{count}', exams.length)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Exam Rules & Requirements */}
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-bold">{t('student.dashboard.rulesTitle')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: t('student.dashboard.cameraRuleTitle'), desc: t('student.dashboard.cameraRuleDesc'), icon: <><circle cx="12" cy="12" r="3" /><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" /></> },
                { title: t('student.dashboard.tabRuleTitle'), desc: t('student.dashboard.tabRuleDesc'), icon: <><rect x="4" y="6" width="16" height="12" rx="1" /><path d="M9 10h6M9 14h3" /></> },
                { title: t('student.dashboard.timerRuleTitle'), desc: t('student.dashboard.timerRuleDesc'), icon: <><circle cx="12" cy="12" r="8" /><polyline points="12 6 12 12 16 14" /></> },
                { title: t('student.dashboard.secureRuleTitle'), desc: t('student.dashboard.secureRuleDesc'), icon: <><path d="M12 2L4 7v9c0 5 8 6 8 6s8-1 8-6V7l-8-5z" /></> }
              ].map((rule) => (
                <div key={rule.title} className="bg-slate-950/40 rounded-xl p-4 flex items-start gap-4 border border-white/5 hover:border-cyan-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex-none">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {rule.icon}
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-1">{rule.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 flex flex-col">
            {/* Next Exam Timer */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group flex-1 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-bold">{t('student.dashboard.nextExam')}</h3>
              </div>

              <div className="text-center py-4 bg-slate-950/40 rounded-xl border border-white/5">
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 text-5xl font-black tracking-tight mb-2 font-mono drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" style={{ direction: 'ltr' }}>
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{t('student.dashboard.timeUntil')} Mathematics 101</p>
              </div>
            </div>

            {/* System Check */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group flex-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h3 className="text-white text-md font-bold mb-4">{t('student.dashboard.systemCheck')}</h3>

              <div className="space-y-3">
                {[
                  { label: t('student.dashboard.cameraPass'), status: 'pass' },
                  { label: t('student.dashboard.micPass'), status: 'pass' },
                  { label: t('student.dashboard.browserPass'), status: 'pass' }
                ].map((check, idx) => (
                  <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <svg className="w-3 h-3 text-emerald-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-emerald-100 text-sm font-semibold">{check.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Available Exams Section */}
        <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md relative overflow-hidden group animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"></div>

          <h3 className="text-white text-xl font-bold mb-6">{t('student.dashboard.upcomingTitle')}</h3>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="relative w-10 h-10 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin" />
              </div>
              <p className="text-slate-400 text-sm">Loading exams...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && exams.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
              <p className="text-slate-400 text-sm">No exams available yet.</p>
            </div>
          )}

          {/* Exams List */}
          {!isLoading && exams.length > 0 && (
            <div className="space-y-4">
              {exams.map((exam) => (
                (() => {
                  const progress = getExamProgress(exam.id)
                  const badgeStyles = progress.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : progress.status === 'in_progress'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'

                  return (
                <div key={exam.id} className="bg-slate-950/40 border border-white/5 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-cyan-500/30 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white text-lg font-bold tracking-tight">{exam.title}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${badgeStyles}`}>
                        {progress.label}
                      </span>
                    </div>
                    {exam.description && (
                      <p className="text-slate-400 text-sm mb-3">{exam.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mt-3">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {exam.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Code: {exam.access_code}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleEnrollExam(exam.id)}
                      className="relative group px-6 py-3 rounded-xl font-bold text-white text-sm transition-all duration-300 hover:-translate-y-0.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        {progress.buttonLabel}
                        <svg className="w-4 h-4 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                    </button>
                  </div>
                </div>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default StudentDashboard
