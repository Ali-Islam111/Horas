import React from 'react'
import rightArt from '../../assets/logo.png'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuthController } from '../controllers/useAuthController'
import AuthService from '../services/authService'

function Login({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { state, actions } = useAuthController(onNavigate)

  // Clear stale session on mount
  React.useEffect(() => {
    AuthService.clearSession();
  }, []);
  
  // Destructure state for easy access in the template
  const { email, password, role, isTransitioning, isLoading, loginError } = state;
  const { setEmail, setPassword, handleRoleChange, handleLogin } = actions;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows - dynamically change based on role */}
      <div className={`fixed top-[-10%] ${language === 'ar' ? 'left-[-5%]' : 'right-[-5%]'} w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none z-0 transition-colors duration-1000 ${role === 'instructor' ? 'bg-emerald-600/20' : 'bg-purple-600/20'}`} />
      <div className={`fixed bottom-[-10%] ${language === 'ar' ? 'right-[-10%]' : 'left-[-10%]'} w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none z-0 transition-colors duration-1000 ${role === 'instructor' ? 'bg-cyan-600/20' : 'bg-cyan-600/20'}`} />

      {/* Language Toggle Button */}
      <div className={`fixed top-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-50`}>
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md"
        >
          {language === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-center max-w-6xl w-full z-10 justify-center">
        <div className="hidden lg:flex items-center flex-shrink-0 animate-fade-in-up" aria-hidden="true">
          <div className="relative">
            <div className={`absolute inset-0 blur-3xl rounded-full transition-all duration-1000 ${role === 'instructor' ? 'bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20' : 'bg-gradient-to-tr from-purple-500/20 to-cyan-500/20'}`}></div>

            {/* Image Transition Wrapper */}
            <div className="relative w-full max-w-[480px] h-[560px] flex items-center justify-center">
              <img
                src={rightArt}
                alt="Authentication decorative"
                className={`absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl transition-all duration-500 transform ${!isTransitioning ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'}`}
              />
            </div>
          </div>
        </div>

        <form
          className={`w-full max-w-md rounded-2xl px-8 py-10 shadow-2xl text-left relative transition-all duration-500 border bg-white/5 backdrop-blur-xl group animate-fade-in-up ${role === 'instructor' ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-white/10 hover:border-purple-500/30'}`}
          onSubmit={handleLogin}
        >
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl pointer-events-none ${role === 'instructor' ? 'bg-gradient-to-br from-emerald-500/0 to-cyan-500/0' : 'bg-gradient-to-br from-purple-500/0 to-cyan-500/0'}`}></div>

          <div className={`absolute left-1/2 -translate-x-1/2 -top-12 w-24 h-24 rounded-2xl p-[1px] transition-all duration-500 group-hover:scale-105 shadow-[0_0_30px_rgba(168,85,247,0.4)] ${role === 'instructor' ? 'bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]'}`}>
            <div className={`w-full h-full rounded-[15px] flex items-center justify-center p-3 transition-colors duration-500 ${role === 'instructor' ? 'bg-slate-900' : 'bg-slate-950'}`}>
              <img src={logo} alt="Horus" className={`w-full h-full object-contain drop-shadow-lg transition-transform duration-500 ${isTransitioning ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`} />
            </div>
          </div>

          <div className="mt-12 text-center text-white text-2xl font-bold tracking-tight mb-2">
            {t('auth.login.welcome')}
          </div>

          {/* Animated Subtitle */}
          <div className="h-6 relative overflow-hidden mb-8 w-full">
            <p className={`text-slate-400 text-center text-sm absolute w-full transition-all duration-500 ${role === 'student' && !isTransitioning ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
              {t('auth.login.studentAccess')}
            </p>
            <p className={`text-emerald-400/80 text-center text-sm absolute w-full transition-all duration-500 ${role === 'instructor' && !isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              {t('auth.login.instructorAccess')}
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6 flex gap-2 p-1 rounded-xl bg-slate-950/50 border border-white/5 relative overflow-hidden">
            {/* Animated Slider Background */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg transition-all duration-500 ease-in-out ${role === 'instructor' ? 'ltr:left-1 rtl:right-1 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_16px_rgba(16,185,129,0.4)]' : 'ltr:left-[calc(50%+2px)] rtl:right-[calc(50%+2px)] bg-gradient-to-r from-purple-600 to-cyan-600 shadow-[0_4px_16px_rgba(168,85,247,0.4)]'}`}
            ></div>

            <button
              type="button"
              onClick={() => handleRoleChange('instructor')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors duration-300 relative z-10 ${role === 'instructor' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth.login.instructor')}
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors duration-300 relative z-10 ${role === 'student' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth.login.student')}
            </button>
          </div>

          {/* Form Fields container with fade effect during transition */}
          <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-xs text-slate-300 font-semibold tracking-wide uppercase">{t('auth.login.emailLabel')}</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <svg className={`h-5 w-5 transition-colors duration-300 ${role === 'instructor' ? 'text-emerald-500/50 group-focus-within/input:text-emerald-400' : 'text-purple-500/50 group-focus-within/input:text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <input
                    className={`w-full ps-10 pe-3 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${role === 'instructor' ? 'focus:ring-emerald-500/50 focus:border-emerald-500/50 hover:border-emerald-500/30' : 'focus:ring-purple-500/50 focus:border-purple-500/50 hover:border-purple-500/30'}`}
                    type="email"
                    placeholder={role === 'student' ? t('auth.login.studentEmailPlaceholder') : t('auth.login.instructorEmailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-xs text-slate-300 font-semibold tracking-wide uppercase">{t('auth.login.passwordLabel')}</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    <svg className={`h-5 w-5 transition-colors duration-300 ${role === 'instructor' ? 'text-emerald-500/50 group-focus-within/input:text-emerald-400' : 'text-purple-500/50 group-focus-within/input:text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    className={`w-full ps-10 pe-3 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${role === 'instructor' ? 'focus:ring-emerald-500/50 focus:border-emerald-500/50 hover:border-emerald-500/30' : 'focus:ring-purple-500/50 focus:border-purple-500/50 hover:border-purple-500/30'}`}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <a href="#" className={`text-xs transition-colors ${role === 'instructor' ? 'text-emerald-400 hover:text-emerald-300' : 'text-purple-400 hover:text-purple-300'}`}>{t('auth.login.forgotPassword')}</a>
            </div>

            {loginError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`mt-6 w-full relative group px-6 py-3.5 rounded-xl font-bold text-white transition-all duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 shadow-lg'} overflow-hidden ${role === 'instructor' ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]'}`}
            >
              <div className={`absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity ${role === 'instructor' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-purple-600 to-cyan-600'}`}></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? t('auth.login.loading', 'Loading...') : t('auth.login.loginState')}
                {!isLoading && (
                  <svg className="w-4 h-4 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={() => AuthService.loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm font-semibold transition-all duration-300 group"
            >
              {/* Official Google G logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C36.9 36.9 44 31.8 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>

            {/* Height transition container for student sign up link */}
            <div className={`flex flex-col gap-2 transition-all duration-500 ease-in-out overflow-hidden ${role === 'student' ? 'mt-5 max-h-20 opacity-100' : 'mt-0 max-h-0 opacity-0'}`}>
              <div className="text-center text-sm text-slate-400">
                {t('auth.login.newToHoras')} {' '}
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('create'); }} className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
                  {t('auth.login.createAccountLink')}
                </a>
              </div>
            </div>

            {/* Height transition container for instructor sign up link */}
            <div className={`flex flex-col gap-2 transition-all duration-500 ease-in-out overflow-hidden ${role === 'instructor' ? 'mt-5 max-h-20 opacity-100' : 'mt-0 max-h-0 opacity-0'}`}>
              <div className="text-center text-sm text-slate-400">
                {t('auth.login.newInstructor')} {' '}
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('create'); }} className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                  {t('auth.login.createInstructorLink')}
                </a>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
