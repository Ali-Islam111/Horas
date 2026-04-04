import React, { useState, useEffect } from 'react';
import logo from '../../assets/Untitled (1).png';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../config/api';
import { fetchSessionEvents } from '../services/proctoringService';

function ExaminerDashboard({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    alertsCount: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    // Fetch profile + student count + current session alerts.
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const sessionId = localStorage.getItem('current_session_id') || localStorage.getItem('session_id');
        const headers = { Authorization: `Bearer ${token}` };

        const [profileResponse, usersResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/users/me`, { headers }),
          fetch(`${API_BASE_URL}/api/users/`, { headers }),
        ]);

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setCurrentUser(profileData);
        }

        let totalStudents = 0;
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          totalStudents = users.filter((user) => user.role === 'student').length;
        }

        let alerts = [];
        if (sessionId) {
          try {
            alerts = await fetchSessionEvents(sessionId);
          } catch (alertError) {
            console.error('Failed to fetch session alerts:', alertError);
          }
        }

        setRecentAlerts(Array.isArray(alerts) ? alerts.slice(0, 4) : []);
        setStats({
          totalStudents,
          alertsCount: Array.isArray(alerts) ? alerts.length : 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock data for the chart - representing weekly performance
  const weeklyData = [
    { week: 1, value: 75 },
    { week: 2, value: 82 },
    { week: 3, value: 88 },
    { week: 4, value: 85 },
    { week: 5, value: 90 },
    { week: 6, value: 87 },
    { week: 7, value: 84 },
    { week: 8, value: 89 },
    { week: 9, value: 86 },
    { week: 10, value: 92 }
  ];

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
              <p className="text-slate-400 text-xs">{t('examiner.dashboard.welcomeDesc')}</p>
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
                const isActive = tab.id === 'examiner';
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

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students */}
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-slate-400 text-sm font-semibold">{t('examiner.dashboard.stats.totalStudents')}</h3>
            </div>
            <p className="text-white text-4xl font-bold tracking-tight mb-1">{stats.totalStudents}</p>
            <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">{t('examiner.dashboard.stats.activeEnrollment')}</p>
          </div>

          {/* Active Exams */}
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3 className="text-slate-400 text-sm font-semibold">{t('examiner.dashboard.stats.activeExams')}</h3>
            </div>
            <p className="text-white text-4xl font-bold tracking-tight mb-1">12</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <p className="text-cyan-400 text-xs font-medium uppercase tracking-wider">{t('examiner.dashboard.stats.inProgress')}</p>
            </div>
          </div>

          {/* AI Alerts */}
          <div className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:bg-white/[0.07] hover:border-orange-500/30 transition-all duration-500 overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-orange-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-slate-400 text-sm font-semibold">{t('examiner.dashboard.stats.aiAlerts')}</h3>
            </div>
            <p className="text-white text-4xl font-bold tracking-tight mb-1">{stats.alertsCount}</p>
            <p className="text-orange-400 text-xs font-medium uppercase tracking-wider">{t('examiner.dashboard.stats.needsReview')}</p>
          </div>

          {/* Live Proctoring Monitor */}
          <div
            onClick={() => onNavigate('proctoringMonitor')}
            className="group relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-md hover:bg-emerald-500/10 cursor-pointer transition-all duration-500 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/20 blur-[40px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-emerald-500/30 transition-all"></div>

            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" />
                </svg>
              </div>
              <h3 className="text-slate-200 text-sm font-semibold">{t('examiner.dashboard.stats.liveMonitor')}</h3>
            </div>
            <p className="relative z-10 text-white text-3xl font-bold tracking-tight mb-1">{t('examiner.dashboard.stats.proctoring')}</p>
            <div className={`relative z-10 flex items-center gap-2 text-emerald-400 text-xs font-medium uppercase tracking-wider transition-transform ${language === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
              <span>{t('examiner.dashboard.stats.viewSessions')}</span>
              <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-2 group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md hover:border-white/10 transition-colors duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-white text-xl font-bold">{t('examiner.dashboard.performance.title')}</h2>
                <p className="text-slate-400 text-sm">{t('examiner.dashboard.performance.desc')}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                +5%
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative h-[280px]">
              {/* Grid Lines */}
              <div className="absolute inset-x-0 inset-y-8 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="border-t border-dashed border-white/10 w-full relative">
                    {i % 2 === 0 && <span className="absolute -left-6 -top-3 text-[10px] text-slate-500">{100 - i * 25}</span>}
                  </div>
                ))}
              </div>

              {/* Chart Map */}
              <div className="absolute inset-0 pt-8 pb-6 pl-4">
                <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
                  {/* Area Fill */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'rgba(168, 85, 247, 0.4)', stopOpacity: 1 }} />
                      <stop offset="50%" style={{ stopColor: 'rgba(6, 182, 212, 0.2)', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: 'rgba(6, 182, 212, 0)', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>

                  {/* Area Path */}
                  <path
                    d={`M 0 ${240 - (weeklyData[0].value * 2.4)} ${weeklyData
                      .map((point, i) => {
                        const x = (i / (weeklyData.length - 1)) * 1000
                        const y = 240 - (point.value * 2.4)
                        return `L ${x} ${y}`
                      })
                      .join(' ')} L 1000 240 L 0 240 Z`}
                    fill="url(#areaGradient)"
                    className="transition-all duration-1000 ease-in-out"
                  />

                  {/* Stroke Line */}
                  <path
                    d={`M 0 ${240 - (weeklyData[0].value * 2.4)} ${weeklyData
                      .map((point, i) => {
                        const x = (i / (weeklyData.length - 1)) * 1000
                        const y = 240 - (point.value * 2.4)
                        return `L ${x} ${y}`
                      })
                      .join(' ')}`}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-in-out"
                  />

                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>

                  {/* Points */}
                  {weeklyData.map((point, i) => {
                    const x = (i / (weeklyData.length - 1)) * 1000
                    const y = 240 - (point.value * 2.4)
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="6"
                        className="fill-[#030014] stroke-cyan-400 stroke-[3px] group-hover:r-8 transition-all duration-300"
                      />
                    )
                  })}
                </svg>
              </div>

              {/* X-axis Labels */}
              <div className="absolute bottom-0 left-4 right-0 flex justify-between">
                {weeklyData.map((week) => (
                  <span key={week.week} className="text-slate-500 text-[10px] font-medium min-w-[20px] text-center">
                    W{week.week}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions / Recent Activity */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md flex flex-col">
            <h2 className="text-white text-xl font-bold mb-6">{t('examiner.dashboard.recentActivity.title')}</h2>

            <div className="flex-1 space-y-6">
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => {
                  const category = (alert.category || '').toUpperCase();
                  const isCritical = category.includes('YOLO');
                  const isWarning = category.includes('EYE') || category.includes('HEAD');
                  const dotClass = isCritical ? 'bg-red-400' : isWarning ? 'bg-orange-400' : 'bg-cyan-400';

                  return (
                    <div key={alert.id} className="flex gap-4 group cursor-pointer">
                      <div className="relative mt-1">
                        <div className={`w-2 h-2 rounded-full ${dotClass} group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(currentColor,0.5)] z-10 relative`}></div>
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold text-slate-200 transition-colors ${isCritical ? 'group-hover:text-red-300' : isWarning ? 'group-hover:text-orange-300' : 'group-hover:text-cyan-300'}`}>{alert.description || 'Alert'}</h4>
                        <p className="text-xs text-slate-400 mt-1">{alert.details || alert.category || 'Violation detected'}</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-400 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  No alert data available for the current session.
                </div>
              )}
            </div>

            <button className="w-full py-3 mt-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-sm text-slate-300 font-semibold transition-colors">
              {t('examiner.dashboard.recentActivity.viewAll')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ExaminerDashboard;
