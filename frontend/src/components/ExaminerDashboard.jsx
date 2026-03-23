import React, { useState, useEffect } from 'react';
import logo from '../../assets/Untitled (1).png';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../config/api';

function ExaminerDashboard({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState(null)

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

      {/* Top Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left - Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-2">
                <img src={logo} alt="Horus" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">{t('examiner.dashboard.welcomeStr')} {currentUser?.full_name || '...'}</h1>
              <p className="text-slate-400 text-sm">{t('examiner.dashboard.welcomeDesc')}</p>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hidden sm:block"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            {/* Create Exam Button */}
            <button
              onClick={() => onNavigate('createExam')}
              className="relative group px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-4 h-4 relative z-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="relative z-10 text-white">{t('examiner.dashboard.createExam')}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => onNavigate('login')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('examiner.dashboard.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="relative z-40 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl px-6 py-0">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'examiner', label: t('examiner.dashboard.nav.overview'), icon: <path d="M18 20V10M12 20V4M6 20v-6" /> },
            { id: 'examinerStudents', label: t('examiner.dashboard.nav.students'), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
            { id: 'examinerExam', label: t('examiner.dashboard.nav.exams'), icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></> },
            { id: 'report', label: t('examiner.dashboard.nav.reports'), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> },
            { id: 'examinerAlerts', label: t('examiner.dashboard.nav.alerts'), icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
            { id: 'examinerSettings', label: t('examiner.dashboard.nav.settings'), icon: <><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6" /></> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-semibold transition-colors relative ${tab.id === 'examiner' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {tab.icon}
              </svg>
              {tab.label}
              {tab.id === 'examiner' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500 rounded-t-full shadow-[0_-2px_10px_rgba(168,85,247,0.5)]"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

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
            <p className="text-white text-4xl font-bold tracking-tight mb-1">200</p>
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
            <p className="text-white text-4xl font-bold tracking-tight mb-1">5</p>
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
                {weeklyData.map((week, index) => (
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
              {[
                { icon: 'alert', title: t('examiner.dashboard.recentActivity.activities.suspicious.title'), desc: t('examiner.dashboard.recentActivity.activities.suspicious.desc'), time: t('examiner.dashboard.recentActivity.activities.suspicious.time'), color: 'orange' },
                { icon: 'check', title: t('examiner.dashboard.recentActivity.activities.completed.title'), desc: t('examiner.dashboard.recentActivity.activities.completed.desc'), time: t('examiner.dashboard.recentActivity.activities.completed.time'), color: 'emerald' },
                { icon: 'student', title: t('examiner.dashboard.recentActivity.activities.enrolled.title'), desc: t('examiner.dashboard.recentActivity.activities.enrolled.desc'), time: t('examiner.dashboard.recentActivity.activities.enrolled.time'), color: 'purple' },
                { icon: 'exam', title: t('examiner.dashboard.recentActivity.activities.saved.title'), desc: t('examiner.dashboard.recentActivity.activities.saved.desc'), time: t('examiner.dashboard.recentActivity.activities.saved.time'), color: 'cyan' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="relative mt-1">
                    <div className={`w-2 h-2 rounded-full bg-${item.color}-400 group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(currentColor,0.5)] z-10 relative`}></div>
                    {i !== 3 && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-white/10 group-hover:bg-white/20 transition-colors"></div>}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold text-slate-200 group-hover:text-${item.color}-300 transition-colors`}>{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">{item.time}</span>
                  </div>
                </div>
              ))}
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
