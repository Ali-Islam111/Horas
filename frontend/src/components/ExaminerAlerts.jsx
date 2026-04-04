import { useState, useEffect } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchSessionEvents } from '../services/proctoringService'

function ExaminerAlerts({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const sessionId = localStorage.getItem('current_session_id') || localStorage.getItem('session_id')
  const [filterType, setFilterType] = useState('all')
  const [rawEvents, setRawEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // ── Map a DB event → alert card shape ─────────────────────────────────────
  const mapEventToAlert = (ev) => {
    const cat = (ev.category || '').toUpperCase()
    let type = 'warning'
    let severity = 'medium'
    if (cat.includes('YOLO')) { type = 'cheating'; severity = 'critical' }
    else if (cat.includes('EYE') || cat.includes('HEAD')) { type = 'warning'; severity = 'high' }

    return {
      id: ev.id,
      type,
      severity,
      status: 'new',
      student: ev.session_id ? `Session #${ev.session_id}` : null,
      exam: null,
      message: `${ev.description} — ${ev.details}`,
      time: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Unknown',
    }
  }

  // ── Fetch events from backend ─────────────────────────────────────────────
  const loadEvents = async () => {
    try {
      setLoading(true)
      setFetchError(null)
      if (!sessionId) {
        setRawEvents([])
        setFetchError('No active student session found')
        return
      }
      const data = await fetchSessionEvents(sessionId)
      setRawEvents(data)
    } catch (err) {
      console.error('[ExaminerAlerts] Fetch error:', err)
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [sessionId])

  const alerts = rawEvents.map(mapEventToAlert)
  const filteredAlerts = alerts.filter(alert => filterType === 'all' || alert.type === filterType)

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    new: alerts.filter(a => a.status === 'new').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  }

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', iconBg: 'bg-red-500/20' }
      case 'high': return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', iconBg: 'bg-orange-500/20' }
      case 'medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' }
      default: return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' }
    }
  }

  const getTypeIcon = (type, className = "w-6 h-6") => {
    switch (type) {
      case 'cheating':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      default:
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none z-0" />

      {/* Unified Single-Row Navbar */}
      <header className="relative z-50 border-b border-white/[0.06] px-6">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">

          {/* Left — Logo + Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 shadow-[0_0_18px_-4px_rgba(168,85,247,0.5)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1.5">
                <img src={logo} alt="Horas" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <span className="text-white font-extrabold text-lg tracking-tight hidden sm:block">HORAS</span>
            <div className="hidden md:block w-px h-5 bg-white/10 mx-1" />
          </div>

          {/* Center — Pill Navigation Tabs */}
          <nav className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'examiner', label: t('examiner.dashboard.nav.overview'), icon: <path d="M18 20V10M12 20V4M6 20v-6" /> },
                { id: 'examinerStudents', label: t('examiner.dashboard.nav.students'), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
                { id: 'examinerExam', label: t('examiner.dashboard.nav.exams'), icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> },
                { id: 'report', label: t('examiner.dashboard.nav.reports'), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> },
                { id: 'examinerAlerts', label: t('examiner.dashboard.nav.alerts'), icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
                { id: 'examinerSettings', label: t('examiner.dashboard.nav.settings'), icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></> },
              ].map((tab) => {
                const isActive = tab.id === 'examinerAlerts';
                return (
                  <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap overflow-hidden active:scale-90 ${isActive
                        ? 'bg-gradient-to-r from-purple-600/80 to-cyan-600/80 text-white border border-purple-500/30 nav-tab-active'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:scale-[1.04] hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {tab.icon}
                    </svg>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right — User + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User Avatar */}
            {(() => {
              const name = localStorage.getItem('full_name') || localStorage.getItem('username') || 'E';
              return (
                <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] cursor-default">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-300 text-xs font-semibold max-w-[100px] truncate">{name}</span>
                </div>
              );
            })()}
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

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.alerts.stats.totalAlerts')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.total}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-red-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-red-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.alerts.stats.critical')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.critical}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.alerts.stats.new')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.new}</p>
          </div>
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/20 transition-all"></div>
            <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('examiner.alerts.stats.resolved')}</h3>
            <p className="text-white text-3xl font-bold tracking-tight">{stats.resolved}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md mb-6 inline-flex overflow-x-auto no-scrollbar max-w-full">
          <div className="flex gap-2 bg-slate-950/50 border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t('examiner.alerts.filters.all')}
            </button>
            <button
              onClick={() => setFilterType('cheating')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'cheating' ? 'bg-red-500/20 text-red-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t('examiner.alerts.filters.cheating')}
            </button>
            <button
              onClick={() => setFilterType('warning')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'warning' ? 'bg-orange-500/20 text-orange-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t('examiner.alerts.filters.warning')}
            </button>
            <button
              onClick={() => setFilterType('system')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'system' ? 'bg-blue-500/20 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t('examiner.alerts.filters.system')}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <svg className="w-8 h-8 text-purple-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <span className="ml-3 text-slate-400 text-sm">Loading events from AI engine...</span>
            </div>
          )}

          {/* Error banner */}
          {fetchError && !loading && (
            <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
              <span>⚠️ Could not load AI events: {fetchError}</span>
              <button onClick={loadEvents} className="ml-4 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors">Retry</button>
            </div>
          )}

          {/* Refresh indicator */}
          {!loading && !fetchError && (
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>{alerts.length} AI event{alerts.length !== 1 ? 's' : ''} for session #{sessionId}</span>
              <button onClick={loadEvents} className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.08-8.23" /></svg>
                Refresh
              </button>
            </div>
          )}

          {!loading && filteredAlerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div key={alert.id} className={`group flex flex-col md:flex-row items-start md:items-center gap-6 rounded-2xl border ${styles.border} ${styles.bg} p-6 backdrop-blur-md hover:bg-white/[0.07] transition-all duration-300 relative overflow-hidden`}>

                <div className={`p-4 rounded-2xl ${styles.iconBg} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  {getTypeIcon(alert.type, `w-7 h-7 ${styles.text}`)}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles.border} ${styles.text} bg-white/5`}>
                      {alert.type}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${alert.status === 'new' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      alert.status === 'reviewed' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${language === 'ar' ? 'ml-1.5' : 'mr-1.5'} ${alert.status === 'new' ? 'bg-emerald-400' :
                        alert.status === 'reviewed' ? 'bg-yellow-400' : 'bg-slate-400'
                        }`}></span>
                      {t(`examiner.alerts.status.${alert.status}`)}
                    </span>
                  </div>

                  <h3 className="text-white text-lg font-bold mb-3 leading-tight truncate">{alert.message}</h3>

                  {alert.student && (
                    <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {alert.student}
                      </span>
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="truncate max-w-[200px]">{alert.exam}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
                  <span className="text-slate-500 text-xs font-medium">{alert.time}</span>
                  <div className={`flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
                    <button className="flex-1 md:flex-none bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-300">
                      {t('examiner.alerts.actions.view')}
                    </button>
                    {alert.status === 'new' && (
                      <button className="flex-1 md:flex-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors duration-300">
                        {t('examiner.alerts.actions.review')}
                      </button>
                    )}
                    {alert.status !== 'resolved' && alert.status !== 'new' && (
                      <button className="flex-1 md:flex-none bg-purple-500/10 border border-purple-500/20 text-purple-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-500/20 transition-colors duration-300">
                        {t('examiner.alerts.actions.resolve')}
                      </button>
                    )}
                    <button className="flex-1 md:flex-none bg-slate-500/10 border border-slate-500/20 text-slate-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors duration-300">
                      {t('examiner.alerts.actions.dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-16 text-center w-full max-w-2xl mx-auto mt-10">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
              <svg className="w-10 h-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('examiner.alerts.empty.title')}</h3>
            <p className="text-slate-400 text-sm">{t('examiner.alerts.empty.desc')}</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default ExaminerAlerts
