import { useState, useEffect } from 'react'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { API_BASE_URL } from '../config/api'

function ExaminerSettings({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const [activeSection, setActiveSection] = useState('profile')
  const [currentUser, setCurrentUser] = useState(null)

  // Settings state
  const [profileSettings, setProfileSettings] = useState({
    name: 'Dr. Escanor',
    email: 'dr.escanor@university.edu',
    department: 'Computer Science',
    phone: '+1 234 567 8900'
  })

  const [examSettings, setExamSettings] = useState({
    defaultDuration: 60,
    allowLateSubmission: false,
    autoGrading: true,
    passingPercentage: 40
  })

  const [proctoringSettings, setProctoringSettings] = useState({
    faceDetection: true,
    tabSwitchDetection: true,
    audioMonitoring: false,
    screenRecording: true,
    suspiciousActivityThreshold: 3
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: false,
    weeklyReports: true,
    criticalAlertsOnly: false
  })

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

    fetchProfile()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    setProfileSettings((prev) => ({
      ...prev,
      name: currentUser.full_name || prev.name,
      email: currentUser.email || prev.email,
    }))
  }, [currentUser])

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
              <p className="text-slate-400 text-xs">{t('examiner.settings.welcomeDesc')}</p>
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
                const isActive = tab.id === 'examinerSettings';
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
      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-4 sticky top-6">
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: t('examiner.settings.nav.profile'), icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
                  { id: 'exam', label: t('examiner.settings.nav.exam'), icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></> },
                  { id: 'proctoring', label: t('examiner.settings.nav.proctoring'), icon: <><circle cx="12" cy="12" r="3" /><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" /></> },
                  { id: 'notifications', label: t('examiner.settings.nav.notifications'), icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></> },
                  { id: 'security', label: t('examiner.settings.nav.security'), icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeSection === item.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                      }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}
                    </svg>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

              {/* Profile Settings */}
              {activeSection === 'profile' && (
                <div className="relative z-10 animate-fade-in-up">
                  <div className="mb-8">
                    <h2 className="text-white text-2xl font-bold tracking-tight mb-2">{t('examiner.settings.profile.title')}</h2>
                    <p className="text-slate-400 text-sm">{t('examiner.settings.profile.desc')}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.profile.fullName')}</label>
                        <input
                          type="text"
                          value={profileSettings.name}
                          onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.profile.email')}</label>
                        <input
                          type="email"
                          value={profileSettings.email}
                          onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.profile.department')}</label>
                        <input
                          type="text"
                          value={profileSettings.department}
                          onChange={(e) => setProfileSettings({ ...profileSettings, department: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.profile.phone')}</label>
                        <input
                          type="tel"
                          value={profileSettings.phone}
                          onChange={(e) => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className={`pt-6 border-t border-white/5 flex ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                      <button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                        {t('examiner.settings.profile.saveBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Settings */}
              {activeSection === 'exam' && (
                <div className="relative z-10 animate-fade-in-up">
                  <div className="mb-8">
                    <h2 className="text-white text-2xl font-bold tracking-tight mb-2">{t('examiner.settings.exam.title')}</h2>
                    <p className="text-slate-400 text-sm">{t('examiner.settings.exam.desc')}</p>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.exam.duration')}</label>
                        <input
                          type="number"
                          value={examSettings.defaultDuration}
                          onChange={(e) => setExamSettings({ ...examSettings, defaultDuration: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.exam.passing')}</label>
                        <input
                          type="number"
                          value={examSettings.passingPercentage}
                          onChange={(e) => setExamSettings({ ...examSettings, passingPercentage: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl bg-slate-950/30 border border-white/5 p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div className={language === 'ar' ? 'pl-4' : 'pr-4'}>
                          <h3 className="text-white font-semibold text-sm mb-1">{t('examiner.settings.exam.lateSub.title')}</h3>
                          <p className="text-slate-400 text-xs">{t('examiner.settings.exam.lateSub.desc')}</p>
                        </div>
                        <button
                          onClick={() => setExamSettings({ ...examSettings, allowLateSubmission: !examSettings.allowLateSubmission })}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${examSettings.allowLateSubmission ? 'bg-purple-500' : 'bg-white/10'
                            }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${examSettings.allowLateSubmission ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className={language === 'ar' ? 'pl-4' : 'pr-4'}>
                          <h3 className="text-white font-semibold text-sm mb-1">{t('examiner.settings.exam.autoGrade.title')}</h3>
                          <p className="text-slate-400 text-xs">{t('examiner.settings.exam.autoGrade.desc')}</p>
                        </div>
                        <button
                          onClick={() => setExamSettings({ ...examSettings, autoGrading: !examSettings.autoGrading })}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${examSettings.autoGrading ? 'bg-purple-500' : 'bg-white/10'
                            }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${examSettings.autoGrading ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>
                    </div>

                    <div className={`pt-2 flex ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                      <button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                        {t('examiner.settings.exam.saveBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Proctoring Settings */}
              {activeSection === 'proctoring' && (
                <div className="relative z-10 animate-fade-in-up">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white text-2xl font-bold tracking-tight mb-1">{t('examiner.settings.proctoring.title')}</h2>
                      <p className="text-slate-400 text-sm">{t('examiner.settings.proctoring.desc')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-950/30 border border-white/5 overflow-hidden">
                      {[
                        { key: 'faceDetection', label: t('examiner.settings.proctoring.face.title'), desc: t('examiner.settings.proctoring.face.desc') },
                        { key: 'tabSwitchDetection', label: t('examiner.settings.proctoring.tab.title'), desc: t('examiner.settings.proctoring.tab.desc') },
                        { key: 'audioMonitoring', label: t('examiner.settings.proctoring.audio.title'), desc: t('examiner.settings.proctoring.audio.desc') },
                        { key: 'screenRecording', label: t('examiner.settings.proctoring.screen.title'), desc: t('examiner.settings.proctoring.screen.desc') }
                      ].map((setting, index) => (
                        <div key={setting.key} className={`flex items-center justify-between p-5 ${index !== 3 ? 'border-b border-white/5' : ''}`}>
                          <div className="pr-4">
                            <h3 className="text-white font-semibold text-sm mb-1">{setting.label}</h3>
                            <p className="text-slate-400 text-xs">{setting.desc}</p>
                          </div>
                          <button
                            onClick={() => setProctoringSettings({ ...proctoringSettings, [setting.key]: !proctoringSettings[setting.key] })}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${proctoringSettings[setting.key] ? 'bg-cyan-500' : 'bg-white/10'
                              }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${proctoringSettings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 px-1">
                      <label className="flex flex-col space-y-2">
                        <span className="text-slate-300 text-sm font-medium">{t('examiner.settings.proctoring.threshold.title')}</span>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={proctoringSettings.suspiciousActivityThreshold}
                            onChange={(e) => setProctoringSettings({ ...proctoringSettings, suspiciousActivityThreshold: e.target.value })}
                            className="w-full accent-cyan-500"
                          />
                          <span className="bg-slate-950/50 border border-white/10 px-4 py-2 rounded-lg font-mono text-cyan-400 font-bold min-w-[3rem] text-center">
                            {proctoringSettings.suspiciousActivityThreshold}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs">{t('examiner.settings.proctoring.threshold.desc')}</p>
                      </label>
                    </div>

                    <div className={`pt-6 border-t border-white/5 flex mt-6 ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                      <button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                        {t('examiner.settings.proctoring.saveBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeSection === 'notifications' && (
                <div className="relative z-10 animate-fade-in-up">
                  <div className="mb-8">
                    <h2 className="text-white text-2xl font-bold tracking-tight mb-2">{t('examiner.settings.notification.title')}</h2>
                    <p className="text-slate-400 text-sm">{t('examiner.settings.notification.desc')}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-950/30 border border-white/5 overflow-hidden">
                      {[
                        { key: 'emailAlerts', label: t('examiner.settings.notification.email.title'), desc: t('examiner.settings.notification.email.desc') },
                        { key: 'pushNotifications', label: t('examiner.settings.notification.push.title'), desc: t('examiner.settings.notification.push.desc') },
                        { key: 'weeklyReports', label: t('examiner.settings.notification.weekly.title'), desc: t('examiner.settings.notification.weekly.desc') },
                        { key: 'criticalAlertsOnly', label: t('examiner.settings.notification.critical.title'), desc: t('examiner.settings.notification.critical.desc') }
                      ].map((setting, index) => (
                        <div key={setting.key} className={`flex items-center justify-between p-5 ${index !== 3 ? 'border-b border-white/5' : ''}`}>
                          <div className="pr-4">
                            <h3 className="text-white font-semibold text-sm mb-1">{setting.label}</h3>
                            <p className="text-slate-400 text-xs">{setting.desc}</p>
                          </div>
                          <button
                            onClick={() => setNotificationSettings({ ...notificationSettings, [setting.key]: !notificationSettings[setting.key] })}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${notificationSettings[setting.key] ? 'bg-purple-500' : 'bg-white/10'
                              }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${notificationSettings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className={`pt-6 border-t border-white/5 flex mt-4 ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                      <button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                        {t('examiner.settings.notification.saveBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && (
                <div className="relative z-10 animate-fade-in-up">
                  <div className="mb-8">
                    <h2 className="text-white text-2xl font-bold tracking-tight mb-2">{t('examiner.settings.security.title')}</h2>
                    <p className="text-slate-400 text-sm">{t('examiner.settings.security.desc')}</p>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-md mb-4 border-b border-white/10 pb-2">{t('examiner.settings.security.changePass')}</h3>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.security.currentPass')}</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.security.newPass')}</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={`text-slate-300 text-sm font-medium ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t('examiner.settings.security.confirmPass')}</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                        <div className={`flex pt-2 ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                          <button className="bg-white/10 hover:bg-white/15 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all border border-white/10">
                            {t('examiner.settings.security.updateBtn')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div>
                          <h3 className="text-emerald-400 font-bold text-md mb-1 flex items-center gap-2">
                            <svg className={`w-5 h-5 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {t('examiner.settings.security.twoFactor.title')}
                          </h3>
                          <p className="text-slate-400 text-sm max-w-md">{t('examiner.settings.security.twoFactor.desc')}</p>
                        </div>
                        <button className="whitespace-nowrap bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 px-6 py-3 rounded-xl font-bold text-sm transition-all">
                          {t('examiner.settings.security.twoFactor.enableBtn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ExaminerSettings
