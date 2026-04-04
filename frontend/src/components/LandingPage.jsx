import React, { useState, useEffect } from 'react';
import logo from '../../assets/Untitled (1).png';
import { useLanguage } from '../contexts/LanguageContext';

export default function LandingPage({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? (scrollY / docH) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Hero Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[800px] rounded-full bg-emerald-600/10 blur-[150px] pointer-events-none" />

      {/* ── Scroll Progress Bar ─────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(168,85,247,0.6)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ── Floating Navbar ─────────────────────────────────────── */}
      <div className="fixed top-3 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-6xl flex items-center justify-between h-14 px-4 rounded-2xl transition-all duration-500">

          {/* Left — Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative w-8 h-8 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)] group-hover:shadow-[0_0_22px_-2px_rgba(168,85,247,0.8)] transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1">
                <img src={logo} alt="Horas" className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <span className="text-white font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:via-white group-hover:to-cyan-300 transition-all duration-300">
              {t('landing.horusTitle')}
            </span>
          </div>



          {/* Right — Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20"
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </button>

            {/* Sign In */}
            <button
              onClick={() => onNavigate('login')}
              className="hidden sm:flex px-5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20"
            >
              {t('landing.signIn')}
            </button>

            {/* Get Started — gradient pill */}
            <button
              onClick={() => onNavigate('create')}
              className="relative group flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(168,85,247,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity" />
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 text-white">{t('landing.getStarted')}</span>
              <svg className={`relative z-10 w-3.5 h-3.5 text-white transition-transform group-hover:${language === 'ar' ? '-translate-x-0.5' : 'translate-x-0.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={language === 'ar' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
              </svg>
            </button>
          </div>
        </nav>
      </div>

      <main className="relative z-10 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full px-6 pt-40 pb-20 max-w-7xl mx-auto flex flex-col items-center text-center">

          {/* Animated Hero Logo */}
          <div className="relative mb-8 w-40 h-40 md:w-56 md:h-56 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 via-cyan-500/40 to-emerald-500/40 blur-2xl rounded-full animate-pulse group-hover:blur-3xl transition-all duration-500"></div>
            <div className="absolute inset-2 bg-slate-950/50 shadow-inner rounded-3xl border border-white/10 backdrop-blur-md"></div>
            <img
              src={logo}
              alt="Horus Logo"
              className="absolute inset-0 w-full h-full object-contain p-8 drop-shadow-[0_0_20px_rgba(168,85,247,0.6)] group-hover:scale-110 transition-transform duration-700 ease-out"
              style={{ animation: 'heroFloat 6s ease-in-out infinite' }}
            />
            <style>{`
              @keyframes heroFloat {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
                100% { transform: translateY(0px); }
              }
            `}</style>
          </div>

          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors cursor-pointer group">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{t('landing.liveBadge')}</span>
            <svg className={`w-4 h-4 text-slate-400 group-hover:${language === 'ar' ? '-translate-x-1 rotate-180' : 'translate-x-1'} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-6 max-w-5xl">
            {t('landing.mainHeadingPart1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 animate-gradient-x p-2">
              {t('landing.mainHeadingPart2')}
            </span>
          </h1>

          <div className="relative mb-10 overflow-visible">
            <h2
              className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase"
              style={{ animation: 'textGlowPulse 4s ease-in-out infinite' }}
            >
              {t('landing.horusMeans')}
            </h2>
            <style>{`
              @keyframes textGlowPulse {
                0%, 100% { 
                  text-shadow: 0 0 15px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.3); 
                  color: #e2e8f0; 
                }
                50% { 
                  text-shadow: 0 0 25px rgba(6,182,212,0.9), 0 0 50px rgba(6,182,212,0.6); 
                  color: #ffffff; 
                }
              }
            `}</style>
          </div>

          <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mb-12 font-light leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 mb-20 w-full justify-center">
            <button
              onClick={() => onNavigate('create')}
              className="group relative px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2"
            >
              {t('landing.startTrial')}
              <svg className={`w-5 h-5 transition-transform group-hover:${language === 'ar' ? '-translate-x-1 rotate-180' : 'translate-x-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={language === 'ar' ? "M10 19l-7-7m0 0l7-7m-7 7h18" : "M14 5l7 7m0 0l-7-7m7-7H3"} />
              </svg>
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md font-semibold text-lg transition-all duration-300 hover:border-white/20 flex items-center justify-center"
            >
              {t('landing.watchDemo')}
            </button>
          </div>

          {/* Stats Glassmorphism Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
            {[
              { label: t('landing.stats.accuracy'), value: '99.9%', color: 'from-purple-400 to-fuchsia-400' },
              { label: t('landing.stats.secured'), value: '50K+', color: 'from-cyan-400 to-blue-400' },
              { label: t('landing.stats.institutions'), value: '250+', color: 'from-emerald-400 to-teal-400' },
              { label: t('landing.stats.monitoring'), value: '24/7', color: 'from-orange-400 to-red-400' }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-4">
                <span className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2 p-1`}>
                  {stat.value}
                </span>
                <span className="text-sm font-medium text-slate-400 uppercase tracking-widest text-center">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features Bento Box */}
        <section className="w-full px-6 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-20 text-balance">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              {t('landing.ecosystem.titlePart1')} <br />
              <span className="text-transparent bg-clip-text bg-[linear-gradient(to_right,#a855f7,#06b6d4)] p-1">{t('landing.ecosystem.titlePart2')}</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {t('landing.ecosystem.desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 auto-rows-[320px]">
            {/* Large Card spanning 2 columns */}
            <div className="md:col-span-2 group relative rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden hover:border-purple-500/50 transition-colors duration-500 flex flex-col justify-between">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} top-0 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2`}></div>

              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-8">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-3 text-white">{t('landing.ecosystem.spatial.title')}</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                  {t('landing.ecosystem.spatial.desc')}
                </p>
              </div>
            </div>

            {/* Standard Card */}
            <div className="group relative rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden hover:border-cyan-500/50 transition-colors duration-500 flex flex-col justify-between">
              <div className={`absolute inset-0 bg-gradient-to-${language === 'ar' ? 'br' : 'bl'} from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} bottom-0 w-48 h-48 bg-cyan-500/20 blur-[60px] rounded-full translate-x-1/3 translate-y-1/3`}></div>

              <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-8">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3 text-white">{t('landing.ecosystem.lockdown.title')}</h3>
                <p className="text-slate-400">
                  {t('landing.ecosystem.lockdown.desc')}
                </p>
              </div>
            </div>

            {/* Standard Card */}
            <div className="group relative rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden hover:border-emerald-500/50 transition-colors duration-500 flex flex-col justify-between">
              <div className={`absolute inset-0 bg-gradient-to-${language === 'ar' ? 'tl' : 'tr'} from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} bottom-0 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3`}></div>

              <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)] mb-8">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3 text-white">{t('landing.ecosystem.analytics.title')}</h3>
                <p className="text-slate-400">
                  {t('landing.ecosystem.analytics.desc')}
                </p>
              </div>
            </div>

            {/* Large Card spanning 2 columns */}
            <div className="md:col-span-2 group relative rounded-[2rem] p-8 border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden hover:border-orange-500/50 transition-colors duration-500 flex flex-col justify-between">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} bottom-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full translate-x-1/3 translate-y-1/3`}></div>

              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.4)] mb-8">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-3 text-white">{t('landing.ecosystem.interventions.title')}</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                  {t('landing.ecosystem.interventions.desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="w-full relative py-32 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-[#030014]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
              {t('landing.cta.protect')}
              <br />
              <span className="text-slate-500">{t('landing.cta.empower')}</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              {t('landing.cta.desc')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => onNavigate('create')}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105"
              >
                {t('landing.cta.createAccount')}
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="px-8 py-4 rounded-full border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-md text-white font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                {t('landing.cta.contact')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-slate-950/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-cyan-500 p-[1px]">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center p-1">
                <img src={logo} alt="Horus" className="w-full h-full object-contain" />
              </div>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">{t('landing.horusTitle')} AI</span>
          </div>

          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">{t('landing.footer.privacy')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('landing.footer.terms')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('landing.footer.security')}</a>
          </div>

          <div className="text-sm font-medium text-slate-500">
            &copy; {new Date().getFullYear()} {t('landing.footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
}
