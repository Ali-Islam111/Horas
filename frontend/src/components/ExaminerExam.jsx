import { useEffect, useState } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { API_BASE_URL } from '../config/api'
import { examService } from '../services/examService'

function ExaminerExam({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const [currentUser, setCurrentUser] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  const getExamType = (title) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('final')) return 'Final'
    if (titleLower.includes('midterm')) return 'Midterm'
    if (titleLower.includes('quiz')) return 'Quiz'
    if (titleLower.includes('test')) return 'Test'
    if (titleLower.includes('project')) return 'Project'
    return 'Exam'
  }

  const getExamStatus = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24))

    if (daysDiff < 1) return 'scheduled'
    if (daysDiff < 30) return 'ongoing'
    return 'completed'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-CA')
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data)
        }
      } catch (error) {
        console.error('Failed to fetch examiner profile:', error)
      }
    }

    const fetchExams = async () => {
      try {
        const data = await examService.getAllExams()
        const processedExams = data.map((exam) => ({
          id: exam.id,
          title: exam.title,
          date: formatDate(exam.created_at),
          duration: exam.duration_minutes,
          totalMarks: exam.total_marks,
          participants: Math.floor(Math.random() * 50) + 20,
          status: getExamStatus(exam.created_at),
          type: getExamType(exam.title),
          createdAt: exam.created_at,
        }))
        setExams(processedExams)
      } catch (error) {
        console.error('Failed to load exams:', error)
        setExams([])
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    fetchExams()
  }, [])

  const filteredExams = exams.filter((exam) => filterStatus === 'all' || exam.status === filterStatus)

  const stats = {
    total: exams.length,
    scheduled: exams.filter((e) => e.status === 'scheduled').length,
    ongoing: exams.filter((e) => e.status === 'ongoing').length,
    completed: exams.filter((e) => e.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/20 blur-[150px] pointer-events-none z-0" />

      <header className="relative z-50 border-b border-white/[0.06] px-6">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 shadow-[0_0_18px_-4px_rgba(168,85,247,0.5)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1.5">
                <img src={logo} alt="Horas" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <div className="leading-tight hidden sm:block">
              <h1 className="text-white text-lg font-extrabold tracking-tight">{t('examiner.dashboard.welcomeStr')} {currentUser?.full_name || '...'}</h1>
              <p className="text-slate-400 text-xs">{t('examiner.exams.welcomeDesc')}</p>
            </div>
          </div>

          <nav className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'examiner', label: t('examiner.dashboard.nav.overview'), icon: <path d="M18 20V10M12 20V4M6 20v-6" /> },
                { id: 'examinerStudents', label: t('examiner.dashboard.nav.students'), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
                { id: 'examinerExam', label: t('examiner.dashboard.nav.exams'), icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> },
                { id: 'report', label: t('examiner.dashboard.nav.reports'), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> },
                { id: 'examinerAlerts', label: t('examiner.dashboard.nav.alerts'), icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
                { id: 'examinerSettings', label: t('examiner.dashboard.nav.settings'), icon: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6" /></> },
              ].map((tab) => {
                const isActive = tab.id === 'examinerExam'
                return (
                  <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap overflow-hidden active:scale-90 ${isActive
                        ? 'bg-gradient-to-r from-purple-600/80 to-cyan-600/80 text-white border border-purple-500/30 nav-tab-active'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:scale-[1.04]'
                      }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {tab.icon}
                    </svg>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] cursor-default">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'I'}
              </div>
              <span className="text-slate-300 text-xs font-semibold max-w-[100px] truncate">{currentUser?.full_name || '...'}</span>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all bg-white/[0.04] hover:bg-white/10 border border-white/[0.07] hover:border-white/20"
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </button>
            <button
              onClick={() => onNavigate('createExam')}
              className="relative group flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 overflow-hidden shadow-[0_0_18px_rgba(168,85,247,0.2)] hover:shadow-[0_0_28px_rgba(168,85,247,0.45)] hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              <svg className="w-3.5 h-3.5 relative z-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="relative z-10 text-white hidden sm:inline">{t('examiner.dashboard.createExam')}</span>
            </button>
            <button
              onClick={() => onNavigate('login')}
              title={t('examiner.dashboard.logout')}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 transition-all bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.07] hover:border-red-500/20"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.exams.stats.totalExams')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.total}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.exams.stats.scheduled')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.scheduled}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.exams.stats.ongoing')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.ongoing}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-orange-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-orange-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.exams.stats.completed')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.completed}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md mb-6 inline-flex overflow-x-auto no-scrollbar max-w-full">
          <div className="flex gap-2 bg-slate-950/50 border border-white/5 rounded-xl p-1">
            <button onClick={() => setFilterStatus('all')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {t('examiner.exams.filters.all')}
            </button>
            <button onClick={() => setFilterStatus('scheduled')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'scheduled' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {t('examiner.exams.filters.scheduled')}
            </button>
            <button onClick={() => setFilterStatus('ongoing')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'ongoing' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {t('examiner.exams.filters.ongoing')}
            </button>
            <button onClick={() => setFilterStatus('completed')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'completed' ? 'bg-orange-500/20 text-orange-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {t('examiner.exams.filters.completed')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md animate-pulse">
                <div className="h-6 bg-white/10 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-white/10 rounded mb-4 w-1/2"></div>
                <div className="space-y-3 mb-6">
                  <div className="h-4 bg-white/10 rounded"></div>
                  <div className="h-4 bg-white/10 rounded"></div>
                  <div className="h-4 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:border-purple-500/30 hover:bg-white/[0.07] transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

                <div className="relative z-10 flex items-start justify-between mb-6">
                  <div className="flex-1 pr-4">
                    <h3 className="text-white text-xl font-bold mb-3 tracking-tight leading-tight">{exam.title}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${exam.status === 'scheduled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : exam.status === 'ongoing' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${language === 'ar' ? 'ml-1.5' : 'mr-1.5'} ${exam.status === 'scheduled' ? 'bg-emerald-400' : exam.status === 'ongoing' ? 'bg-cyan-400' : 'bg-orange-400'}`}></span>
                      {t(`examiner.exams.status.${exam.status}`)}
                    </span>
                  </div>
                  <span className="font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider">{exam.type}</span>
                </div>

                <div className="relative z-10 space-y-4 mb-8">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{t('examiner.exams.card.date')}</span>
                    </div>
                    <span className="text-slate-200 font-medium">{exam.date}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{t('examiner.exams.card.duration')}</span>
                    </div>
                    <span className="text-slate-200 font-medium">{exam.duration} {t('examiner.exams.card.min')}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-white/5 pt-4 mt-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span className="text-slate-200 font-medium">{exam.participants}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                      </svg>
                      <span className="text-slate-200 font-medium">{exam.totalMarks} {t('examiner.exams.card.pts')}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex gap-3 mt-auto">
                  <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors duration-300">
                    {t('examiner.exams.card.viewDetails')}
                  </button>
                  <button className={`w-12 flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white py-2.5 rounded-xl transition-colors duration-300 ${language === 'ar' ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-16 text-center w-full max-w-2xl mx-auto mt-10">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
              <svg className="w-10 h-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('examiner.exams.empty.title')}</h3>
            <p className="text-slate-400 text-sm">{t('examiner.exams.empty.desc')}</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default ExaminerExam
