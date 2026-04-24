import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config/api'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'

function ExamReportScreen({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const [currentUser, setCurrentUser]     = useState(null)
  const [filterType, setFilterType]       = useState('all')
  const [studentsData, setStudentsData]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  // ── Detect if we came from a student row ─────────────────────────────
  const studentId   = localStorage.getItem('report_student_id')
  const studentName = localStorage.getItem('report_student_name')
  const isStudentView = Boolean(studentId)

  // API endpoint
  // Student names mapping (in real app, this would come from database)
  const studentNames = {
    'ST001': 'Ahmed Ali',
    'ST002': 'Sara Mohamed',
    'ST003': 'Youssef Hassan',
    'ST004': 'Mariam Adel',
    'ST005': 'Omar Hassan',
    'ST006': 'Fatima Ibrahim',
    'ST007': 'Mohamed Khaled',
    'ST008': 'Nour Sayed'
  }

  useEffect(() => {
    const token = localStorage.getItem('auth_token')

    const fetchProfile = async () => {
      try {
        if (!token) return
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) setCurrentUser(await response.json())
      } catch (error) {
        console.error('Failed to fetch examiner profile:', error)
      }
    }

    // ── Student-specific report view ─────────────────────────────────────
    const fetchStudentReports = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `${API_BASE_URL}/api/sessions/reports/student/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()    // List[ReportListItem]
        setStudentsData(data)
      } catch (err) {
        console.error('[ExamReportScreen] Failed to fetch student reports:', err)
      } finally {
        setLoading(false)
      }
    }

    // ── Teacher overview — all submissions ───────────────────────────────
    const fetchAllSubmissions = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE_URL}/api/sessions/all-submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = await res.json()    // List[SessionResponse]
        setStudentsData(data)
      } catch (err) {
        console.error('[ExamReportScreen] Failed to fetch all submissions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    if (isStudentView) {
      fetchStudentReports()
    } else {
      fetchAllSubmissions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  // ── Download handler ─────────────────────────────────────────────────
  const handleDownload = async (sessionId) => {
    setDownloadingId(sessionId)
    setDownloadError(null)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${API_BASE_URL}/api/sessions/${sessionId}/report`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Error ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `report_session_${sessionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Download]', err)
      setDownloadError(`Could not download report: ${err.message}`)
    } finally {
      setDownloadingId(null)
    }
  }

  // ── Derived data for the overview mode ───────────────────────────────
  const candidates = isStudentView
    ? []   // student view uses its own list below
    : studentsData

  const activityData = candidates.map(s => ({
    name: `S#${s.user_id || s.id}`,
    suspiciousMoves: s.final_score ? Math.round(100 - s.final_score) : 0,
    warnings: s.has_report ? 1 : 0,
  }))

  const stats = {
    totalParticipants:  studentsData.length,
    completedExams:     studentsData.filter(s => s.status === 'completed').length,
    ongoingExams:       studentsData.filter(s => s.status === 'in_progress').length,
    flaggedForCheating: studentsData.filter(s => s.has_report).length,
  }

  const filteredCandidates = filterType === 'all'
    ? candidates
    : candidates.filter(c => c.has_report)

  const maxValue = activityData.length > 0
    ? Math.max(...activityData.flatMap(d => [d.suspiciousMoves, d.warnings]), 1)
    : 10

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>

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
            <span className="text-white font-extrabold text-lg tracking-tight hidden sm:block">HORAS</span>
            <div className="hidden md:block w-px h-5 bg-white/10 mx-1" />
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
                const isActive = tab.id === 'report'
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
              <span className="relative z-10 text-white hidden sm:inline">{t('examiner.report.createBtn')}</span>
            </button>
            <button
              onClick={() => onNavigate('login')}
              title={t('examiner.report.logoutBtn')}
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

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(168,85,247,0.3)]"></div>
              <p className="text-white text-lg font-bold">{t('examiner.report.loading')}</p>
              <p className="text-slate-400 text-sm mt-2">{t('examiner.report.connecting')}</p>
            </div>
          </div>
        ) : isStudentView ? (
          // ── Student report detail view ─────────────────────────────────
          <div className="animate-fade-in-up">
            {/* Back breadcrumb */}
            <button
              onClick={() => {
                localStorage.removeItem('report_student_id')
                localStorage.removeItem('report_student_name')
                onNavigate('examinerStudents')
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Students
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                {studentName?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{studentName || `Student #${studentId}`}</h2>
                <p className="text-slate-400 text-sm">{studentsData.length} proctoring report{studentsData.length !== 1 ? 's' : ''} found</p>
              </div>
            </div>

            {/* Download error banner */}
            {downloadError && (
              <div className="flex items-center gap-3 mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {downloadError}
                <button onClick={() => setDownloadError(null)} className="ml-auto text-red-300 hover:text-red-100 font-semibold">Dismiss</button>
              </div>
            )}

            {studentsData.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-16 text-center">
                <div className="w-20 h-20 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                  <svg className="w-10 h-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Reports Yet</h3>
                <p className="text-slate-400 text-sm">This student has no completed proctoring reports.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentsData.map((session) => (
                  <div
                    key={session.id}
                    className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 hover:bg-white/[0.07] hover:border-purple-500/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Session #{session.id} — Exam #{session.exam_id}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            session.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              session.status === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`} />
                            {session.status}
                          </span>
                          {session.final_score !== null && session.final_score !== undefined && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${
                              session.final_score >= 85
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : session.final_score >= 70
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            }`}>
                              Score: {Math.round(session.final_score)}%
                            </span>
                          )}
                          {session.submitted_at && (
                            <span className="text-slate-500 text-xs">
                              {new Date(session.submitted_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.has_report ? (
                        <button
                          onClick={() => handleDownload(session.id)}
                          disabled={downloadingId === session.id}
                          className="relative group/btn flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 overflow-hidden shadow-[0_0_14px_rgba(168,85,247,0.2)] hover:shadow-[0_0_22px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-90 group-hover/btn:opacity-100 transition-opacity" />
                          <svg className="w-3.5 h-3.5 relative z-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {downloadingId === session.id
                              ? <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>}
                          </svg>
                          <span className="relative z-10 text-white">
                            {downloadingId === session.id ? 'Downloading…' : 'Download PDF'}
                          </span>
                        </button>
                      ) : (
                        <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-slate-500">
                          No Report
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full -translate-y-1/2 group-hover:bg-purple-500/20 transition-all end-0 translate-x-1/2 rtl:-translate-x-1/2"></div>
                <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.report.stats.total')}</h3>
                <p className="text-white text-4xl font-bold tracking-tight">{stats.totalParticipants}</p>
              </div>

              <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full -translate-y-1/2 group-hover:bg-emerald-500/20 transition-all end-0 translate-x-1/2 rtl:-translate-x-1/2"></div>
                <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.report.stats.completed')}</h3>
                <p className="text-white text-4xl font-bold tracking-tight">{stats.completedExams}</p>
              </div>

              <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full -translate-y-1/2 group-hover:bg-cyan-500/20 transition-all end-0 translate-x-1/2 rtl:-translate-x-1/2"></div>
                <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.report.stats.ongoing')}</h3>
                <p className="text-white text-4xl font-bold tracking-tight">{stats.ongoingExams}</p>
              </div>

              <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-red-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 w-24 h-24 bg-red-500/10 blur-[30px] rounded-full -translate-y-1/2 group-hover:bg-red-500/20 transition-all end-0 translate-x-1/2 rtl:-translate-x-1/2"></div>
                <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.report.stats.flagged')}</h3>
                <p className="text-white text-4xl font-bold tracking-tight">{stats.flaggedForCheating}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Section - Table and Chart */}
              <div className="lg:col-span-2 space-y-6 flex flex-col">

                {/* Candidates Table */}
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md overflow-hidden flex-1 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
                  <div className="p-6 border-b border-white/5 flex items-center justify-between pb-4">
                    <div>
                      <h2 className="text-white text-lg font-bold">{t('examiner.report.table.title')}</h2>
                      <p className="text-slate-400 text-xs mt-1">{t('examiner.report.table.subtitle')}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full relative z-10 text-start">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/50">
                          <th className="text-slate-300 text-xs font-semibold py-4 px-6 uppercase tracking-wider text-start">{t('examiner.report.table.colName')}</th>
                          <th className="text-center text-slate-300 text-xs font-semibold py-4 px-4 uppercase tracking-wider">{t('examiner.report.table.colMoves')}</th>
                          <th className="text-center text-slate-300 text-xs font-semibold py-4 px-4 uppercase tracking-wider">{t('examiner.report.table.colWarnings')}</th>
                          <th className="text-center text-slate-300 text-xs font-semibold py-4 px-4 uppercase tracking-wider">{t('examiner.report.table.colFlagged')}</th>
                          <th className="text-center text-slate-300 text-xs font-semibold py-4 px-4 uppercase tracking-wider">{t('examiner.report.table.colDuration')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-400 text-sm">{t('examiner.report.table.empty')}</td>
                          </tr>
                        ) : filteredCandidates.map((candidate, index) => (
                          <tr key={candidate.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="text-white text-sm py-4 px-6 font-medium tracking-wide text-start">{candidate.name}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/50 text-cyan-400 font-mono text-sm border border-cyan-500/20">
                                {candidate.suspiciousMoves}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/50 text-purple-400 font-mono text-sm border border-purple-500/20">
                                {candidate.warnings}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {candidate.cheatingDetected ? (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="text-slate-300 text-sm py-4 px-4 text-center font-mono">{candidate.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Exam Activity Overview Chart */}
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

                  <h3 className="text-white text-lg font-bold mb-6 relative z-10">{t('examiner.report.chart.title')}</h3>

                  {/* Legend */}
                  <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                      <span className="text-slate-300 text-sm font-medium">{t('examiner.report.table.colMoves')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                      <span className="text-slate-300 text-sm font-medium">{t('examiner.report.table.colWarnings')}</span>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="relative h-64 z-10">
                    <div className="absolute inset-0 flex items-end justify-around gap-2 px-2 md:px-6">
                      {activityData.slice(0, 10).map((data, index) => ( // limit to 10 for aesthetics
                        <div key={index} className="flex flex-col items-center gap-3 flex-1 group/bar">
                          {/* Bars */}
                          <div className="flex items-end justify-center w-full gap-1 h-48 relative">
                            {/* Suspicious Moves Bar */}
                            <div
                              className="w-1/2 max-w-[1.5rem] bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-700 relative overflow-hidden group-hover/bar:from-cyan-500 group-hover/bar:to-cyan-300"
                              style={{ height: `${data.suspiciousMoves === 0 ? 5 : (data.suspiciousMoves / maxValue) * 100}%` }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-1 bg-white/40"></div>
                            </div>
                            {/* Warnings Bar */}
                            <div
                              className="w-1/2 max-w-[1.5rem] bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm transition-all duration-700 relative overflow-hidden group-hover/bar:from-purple-500 group-hover/bar:to-purple-300"
                              style={{ height: `${data.warnings === 0 ? 5 : (data.warnings / maxValue) * 100}%` }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-1 bg-white/40"></div>
                            </div>
                          </div>
                          {/* Label */}
                          <span className="text-slate-400 text-xs font-medium truncate w-full text-center group-hover/bar:text-white transition-colors">
                            {data.name.substring(0, 6)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Y-axis lines */}
                    <div className="absolute inset-x-0 inset-y-8 flex flex-col justify-between pointer-events-none pb-8 border-l border-white/10 pl-2">
                      {/* Background Guide Lines */}
                      {[100, 75, 50, 25, 0].map((percent, i) => (
                        <div key={i} className="border-t border-white/5 w-full relative">
                          <span className="absolute -left-7 -top-2.5 text-slate-500 font-mono text-[10px]">{Math.round(maxValue * (percent / 100))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Filter */}
              <div>
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 sticky top-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <svg className="w-5 h-5 rtl:scale-x-[-1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-bold w-full">{t('examiner.report.filter.title')}</h3>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-medium text-sm transition-all duration-300 ${filterType === 'all'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
                        {t('examiner.report.filter.all')}
                      </span>
                    </button>

                    <button
                      onClick={() => setFilterType('cheating')}
                      className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-medium text-sm transition-all duration-300 tracking-wide ${filterType === 'cheating'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        {t('examiner.report.filter.cheating')}
                      </span>
                      {stats.flaggedForCheating > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {stats.flaggedForCheating}
                        </span>
                      )}
                    </button>

                    <div className="pt-6 mt-6 border-t border-white/5">
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {t('examiner.report.filter.desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ExamReportScreen