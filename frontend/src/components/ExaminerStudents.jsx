import { useEffect, useState } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { API_BASE_URL, API_ENDPOINTS } from '../config/api'

function ExaminerStudents({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const [currentUser, setCurrentUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [students, setStudents] = useState([])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data)
        }
      } catch (error) {
        console.error('Failed to fetch examiner profile:', error)
      }
    }

    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/users/`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const submissionsResponse = await fetch(API_ENDPOINTS.ALL_SUBMISSIONS, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`)
        }

        const users = await response.json()
        const submissions = submissionsResponse.ok ? await submissionsResponse.json() : []

        const submissionsByStudent = submissions.reduce((acc, session) => {
          if (!acc[session.user_id]) {
            acc[session.user_id] = []
          }
          acc[session.user_id].push(session)
          return acc
        }, {})

        const getSubmittedSessions = (studentSessions) => (
          studentSessions
            .filter((s) => s.final_score !== null && s.final_score !== undefined)
            .sort((a, b) => new Date(b.submitted_at || b.started_at) - new Date(a.submitted_at || a.started_at))
        )

        const formatDate = (dateValue) => {
          if (!dateValue) return '-'
          const d = new Date(dateValue)
          if (Number.isNaN(d.getTime())) return '-'
          return d.toISOString().slice(0, 10)
        }

        const mappedStudents = users
          .filter((user) => user.role === 'student')
          .map((user) => {
            const studentSessions = submissionsByStudent[user.id] || []
            const submittedSessions = getSubmittedSessions(studentSessions)
            const latestSubmitted = submittedSessions[0]

            return {
              id: user.id,
              name: user.full_name,
              email: user.email,
              studentId: `ST${String(user.id).padStart(3, '0')}`,
              examsCompleted: submittedSessions.length,
              latestGrade: latestSubmitted ? latestSubmitted.final_score : null,
              status: submittedSessions.length > 0 ? 'active' : 'inactive',
              joinDate: formatDate(latestSubmitted?.submitted_at),
            }
          })

        setStudents(mappedStudents)
      } catch (error) {
        console.error('Failed to fetch students:', error)
      }
    }

    fetchStudents()
  }, [])

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = [
    { label: 'total', value: students.length },
    { label: 'active', value: students.filter(s => s.status === 'active').length },
    { label: 'inactive', value: students.filter(s => s.status === 'inactive').length },
    {
      label: 'avgScore',
      value: students.some((s) => s.latestGrade !== null)
        ? `${Math.round(
          students.filter((s) => s.latestGrade !== null).reduce((sum, s) => sum + s.latestGrade, 0) /
          students.filter((s) => s.latestGrade !== null).length
        )}%`
        : '0%'
    }
  ]

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Top Header + Navigation */}
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
              <p className="text-slate-400 text-xs">{t('examiner.students.welcomeDesc')}</p>
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
                const isActive = tab.id === 'examinerStudents';
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
            <button onClick={toggleLanguage} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all bg-white/[0.04] hover:bg-white/10 border border-white/[0.07] hover:border-white/20">
              {language === 'en' ? 'عربي' : 'EN'}
            </button>
            <button onClick={() => onNavigate('createExam')} className="relative group flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 overflow-hidden shadow-[0_0_18px_rgba(168,85,247,0.2)] hover:shadow-[0_0_28px_rgba(168,85,247,0.45)] hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              <svg className="w-3.5 h-3.5 relative z-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="relative z-10 text-white hidden sm:inline">{t('examiner.dashboard.createExam')}</span>
            </button>
            <button onClick={() => onNavigate('login')} title={t('examiner.dashboard.logout')} className="p-2 rounded-xl text-slate-400 hover:text-red-400 transition-all bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.07] hover:border-red-500/20">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
              <div className={`absolute right-0 top-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-all`}></div> {/* This div's bg color needs to be dynamic based on stat.color if desired */}
              <h3 className="text-slate-400 text-sm font-semibold mb-2">{t(`examiner.students.stats.${stat.label}`)}</h3>
              <p className="text-white text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('examiner.students.searchPlaceholder')}
              className="w-full px-4 py-2.5 pl-11 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('proctoringMonitor')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" />
              </svg>
              {t('examiner.students.liveMonitor')}
            </button>
            <div className="flex bg-slate-950/50 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t('examiner.students.filters.all')}
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t('examiner.students.filters.active')}
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'inactive' ? 'bg-orange-500/20 text-orange-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t('examiner.students.filters.inactive')}
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.studentId')}</th>
                  <th className="text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.name')}</th>
                  <th className="text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.email')}</th>
                  <th className="text-center text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.exams')}</th>
                  <th className="text-center text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{language === 'ar' ? 'الدرجة بعد التسليم' : 'Submitted Grade'}</th>
                  <th className="text-center text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.status')}</th>
                  <th className="text-center text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.joinDate')}</th>
                  <th className="text-center text-slate-300 text-xs font-semibold uppercase tracking-wider py-4 px-6">{t('examiner.students.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">{student.studentId}</span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-white">{student.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-400">{student.email}</td>
                    <td className="py-4 px-6 text-sm text-slate-300 text-center">{student.examsCompleted}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border ${student.latestGrade === null
                        ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        : student.latestGrade >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : student.latestGrade >= 70
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                        {student.latestGrade === null ? '-' : `${Math.round(student.latestGrade)}%`}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                        {student.status === 'active' ? t('examiner.students.status.active') : t('examiner.students.status.inactive')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400 text-center">{student.joinDate}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View Report Button */}
                        <button
                          onClick={() => {
                            localStorage.setItem('report_student_id', String(student.id))
                            localStorage.setItem('report_student_name', student.name)
                            onNavigate('report')
                          }}
                          className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-purple-500/20 hover:text-purple-400 transition-colors border border-transparent hover:border-purple-500/30"
                          title="View Proctoring Report"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </button>
                        <button className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors" title="View Details">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors" title="Edit Student">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Remove Student">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('examiner.students.empty')}</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ExaminerStudents
