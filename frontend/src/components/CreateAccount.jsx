import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuthController } from '../controllers/useAuthController'
import AuthService from '../services/authService'
import logo from '../../assets/Untitled (1).png'

/* ─── tiny hook: track which field is focused ─── */
function useFormProgress(role, fullName, email, studentId, department, institution, password, confirmPassword) {
  const fields = role === 'student'
    ? [fullName, email, studentId, password, confirmPassword]
    : [fullName, email, department, institution, password, confirmPassword]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

/* ─── Floating-label input ─── */
function FloatInput({ id, type = 'text', label, icon, value, onChange, required, placeholder, accentClass, glowClass, dir }) {
  const isRtl = dir === 'rtl'
  return (
    <div className="relative group/inp">
      {/* Icon */}
      <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none z-10`}>
        <span className={`transition-colors duration-300 ${accentClass}`}>{icon}</span>
      </div>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder=" "
        className={`
          peer w-full
          ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'}
          pt-5 pb-2 rounded-xl
          bg-white/5 border border-white/10
          text-white text-sm
          focus:outline-none
          transition-all duration-300
          group-hover/inp:border-white/20
          ${glowClass}
          focus:border-transparent
          focus:bg-white/8
        `}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={`
          absolute ${isRtl ? 'right-10' : 'left-10'} top-3.5
          text-xs text-slate-400 font-medium
          transition-all duration-300 pointer-events-none
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500
          peer-focus:top-1.5 peer-focus:text-[10px] ${accentClass.replace('group-focus-within/inp:', '')}
          peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[10px]
        `}
      >
        {label}
      </label>

      {/* Bottom glow line */}
      <div className={`absolute bottom-0 ${isRtl ? 'right-0' : 'left-0'} h-[2px] w-0 peer-focus:w-full transition-all duration-500 rounded-full ${accentClass.includes('emerald') ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-purple-500 to-cyan-400'}`} />
    </div>
  )
}

function CreateAccount({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()
  const { state, actions } = useAuthController(onNavigate)

  const {
    fullName, email, studentId, department, institution, password, confirmPassword,
    role, isTransitioning, isLoading, registerError, registerSuccess
  } = state

  const {
    setFullName, setEmail, setStudentId, setDepartment, setInstitution, setPassword, setConfirmPassword,
    handleRoleChange, handleRegister
  } = actions

  const progress = useFormProgress(role, fullName, email, studentId, department, institution, password, confirmPassword)
  const isInstructor = role === 'instructor'
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  /* color tokens driven by role */
  const accent     = isInstructor ? 'emerald' : 'purple'
  const iconAccent = isInstructor ? 'text-emerald-400/60 group-focus-within/inp:text-emerald-400' : 'text-purple-400/60 group-focus-within/inp:text-purple-400'
  const glowInput  = isInstructor ? 'glow-input-emerald' : 'glow-input-purple'
  const btnGrad    = isInstructor ? 'from-emerald-500 to-teal-500'   : 'from-purple-500 to-cyan-500'
  const ringGlow   = isInstructor ? 'shadow-emerald-500/40'          : 'shadow-purple-500/40'
  const logoGrad   = isInstructor ? 'from-emerald-500 via-teal-400 to-cyan-500' : 'from-purple-500 via-pink-400 to-cyan-500'
  const sliderPos  = isInstructor
    ? (dir === 'rtl' ? 'right-1' : 'left-1')
    : (dir === 'rtl' ? 'right-[calc(50%+2px)]' : 'left-[calc(50%+2px)]')
  const sliderGrad = isInstructor ? 'from-emerald-600 to-teal-600 shadow-emerald-500/40' : 'from-purple-600 to-cyan-600 shadow-purple-500/40'

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30 p-4"
      dir={dir}
    >
      {/* ── Noise texture ── */}
      <div className="fixed inset-0 opacity-[0.18] pointer-events-none mix-blend-soft-light z-0"
        style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />

      {/* ── Grid ── */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(to right,#4f4f4f1a 1px,transparent 1px),linear-gradient(to bottom,#4f4f4f1a 1px,transparent 1px)',
          backgroundSize: '18px 28px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)'
        }} />

      {/* ── Floating ambient orbs ── */}
      <div
        className={`animate-float-orb fixed top-[-8%] ${dir === 'rtl' ? 'left-[-4%]' : 'right-[-4%]'} w-[520px] h-[520px] rounded-full blur-[130px] pointer-events-none z-0 transition-colors duration-1000
          ${isInstructor ? 'bg-emerald-600/25' : 'bg-purple-600/22'}`}
      />
      <div
        className={`animate-float-orb-slow fixed bottom-[-12%] ${dir === 'rtl' ? 'right-[-8%]' : 'left-[-8%]'} w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none z-0
          ${isInstructor ? 'bg-teal-600/18' : 'bg-cyan-600/18'}`}
      />
      {/* small accent orb */}
      <div className={`fixed top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none z-0 transition-all duration-1000
        ${isInstructor ? 'bg-emerald-700/10' : 'bg-indigo-700/12'}`} />

      {/* ── Language toggle ── */}
      <div className={`fixed top-5 ${dir === 'rtl' ? 'left-5' : 'right-5'} z-50`}>
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md hover:scale-105 active:scale-95"
        >
          {language === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {/* ─────────────── Card ─────────────── */}
      <div className="relative z-10 w-full max-w-xl animate-zoom-in-down">

        {/* ── Progress ring + Logo ── */}
        <div className="flex justify-center mb-8">
          <div className="relative mt-2">

            {/* Circular progress indicator */}
            <svg
              className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] -rotate-90 transition-all duration-700"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke={isInstructor ? '#10b981' : '#a855f7'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Logo box */}
            <div className={`relative w-32 h-32 rounded-2xl p-[1.5px] bg-gradient-to-br ${logoGrad} shadow-2xl shadow-${accent}-500/40 transition-all duration-500 hover:scale-105`} style={{ perspective: '600px' }}>
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center p-3">
                <img
                  src={logo} alt="Horus"
                  className="w-full h-full object-contain drop-shadow-lg"
                  style={{
                    transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                    transform: isTransitioning ? 'rotateY(90deg) scale(0.85)' : 'rotateY(0deg) scale(1)',
                  }}
                />
              </div>
            </div>

            {/* Progress % badge */}
            <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-950 transition-all duration-500 bg-gradient-to-br ${logoGrad}`}>
              {progress}%
            </div>
          </div>
        </div>

        {/* Card shell */}
        <div className={`relative rounded-2xl border backdrop-blur-2xl transition-all duration-500 overflow-hidden
          ${isInstructor ? 'border-emerald-500/20 bg-gradient-to-br from-slate-900/80 via-emerald-950/10 to-slate-900/80' : 'border-purple-500/15 bg-gradient-to-br from-slate-900/80 via-purple-950/10 to-slate-900/80'}`}>

          {/* Inner shimmer top bar */}
          <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${isInstructor ? 'via-emerald-400/60' : 'via-purple-400/60'} to-transparent`} />

          {/* Corner glow accent */}
          <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-32 h-32 rounded-full blur-3xl pointer-events-none transition-all duration-1000
            ${isInstructor ? 'bg-emerald-500/8' : 'bg-purple-500/8'}`} />

          <form onSubmit={handleRegister} className="relative px-8 pt-8 pb-9">

            {/* ── Title ── */}
            <div className="text-center mb-1 animate-fade-slide-up">
              <h1 className="text-2xl font-bold tracking-tight text-white">{t('auth.create.joinTitle')}</h1>
            </div>

            {/* ── Animated subtitle ── */}
            <div className="h-5 relative overflow-hidden mb-5">
              <p className={`text-slate-400 text-center text-sm absolute w-full transition-all duration-500 ${role === 'student' && !isTransitioning ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                {t('auth.create.studentDesc')}
              </p>
              <p className={`text-emerald-400/80 text-center text-sm absolute w-full transition-all duration-500 ${role === 'instructor' && !isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                {t('auth.create.instructorDesc')}
              </p>
            </div>

            {/* ── Role toggle ── */}
            <div className="mb-6 flex gap-2 p-1.5 rounded-xl bg-black/30 border border-white/5 relative overflow-hidden field-stagger-1">
              {/* slider */}
              <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-8px)] rounded-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-gradient-to-r ${sliderGrad} shadow-lg ${sliderPos}`} />

              <button type="button" onClick={() => handleRoleChange('instructor')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors duration-300 relative z-10 ${isInstructor ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                {t('auth.login.instructor')}
              </button>
              <button type="button" onClick={() => handleRoleChange('student')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors duration-300 relative z-10 ${!isInstructor ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                {t('auth.login.student')}
              </button>
            </div>

            {/* ── Fields ── */}
            <div className={`transition-all duration-300 space-y-4 ${isTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100'}`}>

              {/* Full Name */}
              <div className="field-stagger-2">
                <FloatInput
                  id="ca-fullname" label={t('auth.create.fullName')} value={fullName}
                  onChange={e => setFullName(e.target.value)} required dir={dir}
                  accentClass={iconAccent} glowClass={glowInput}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
              </div>

              {/* Email */}
              <div className="field-stagger-3">
                <FloatInput
                  id="ca-email" type="email" label={t('auth.login.emailLabel')} value={email}
                  onChange={e => setEmail(e.target.value)} required dir={dir}
                  accentClass={iconAccent} glowClass={glowInput}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  }
                />
              </div>

              {/* Student ID */}
              {role === 'student' && (
                <div className="field-stagger-4">
                  <FloatInput
                    id="ca-sid" label={t('auth.create.studentId')} value={studentId}
                    onChange={e => setStudentId(e.target.value)} required={role === 'student'} dir={dir}
                    accentClass={iconAccent} glowClass={glowInput}
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    }
                  />
                </div>
              )}

              {/* Department + Institution */}
              {role === 'instructor' && (
                <>
                  <div className="field-stagger-4">
                    <FloatInput
                      id="ca-dept" label={t('auth.instructor.department')} value={department}
                      onChange={e => setDepartment(e.target.value)} required={role === 'instructor'} dir={dir}
                      accentClass={iconAccent} glowClass={glowInput}
                      icon={
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      }
                    />
                  </div>
                  <div className="field-stagger-5">
                    <FloatInput
                      id="ca-inst" label={t('auth.instructor.institution')} value={institution}
                      onChange={e => setInstitution(e.target.value)} required={role === 'instructor'} dir={dir}
                      accentClass={iconAccent} glowClass={glowInput}
                      icon={
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2L2 8v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V8l-10-6z" />
                        </svg>
                      }
                    />
                  </div>
                </>
              )}

              {/* Password row */}
              <div className="grid grid-cols-2 gap-3 field-stagger-5">
                <FloatInput
                  id="ca-pass" type="password" label={t('auth.login.passwordLabel')} value={password}
                  onChange={e => setPassword(e.target.value)} required dir={dir}
                  accentClass={iconAccent} glowClass={glowInput}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                />
                <FloatInput
                  id="ca-cpass" type="password" label={t('auth.create.passwordConfirm')} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required dir={dir}
                  accentClass={iconAccent} glowClass={glowInput}
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  }
                />
              </div>

              {/* Error / Success */}
              {registerError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2 animate-fade-slide-up">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {registerError}
                </div>
              )}
              {registerSuccess && (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2 animate-fade-slide-up">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  {t('auth.create.accountCreated')}
                </div>
              )}

              {/* ── Submit button ── */}
              <button
                type="submit"
                disabled={isLoading || registerSuccess}
                className={`field-stagger-6 mt-3 w-full relative group overflow-hidden px-6 py-4 rounded-xl font-bold text-base text-white transition-all duration-300
                  ${isLoading || registerSuccess ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-[0.98]'}
                  shadow-lg hover:shadow-2xl`}
                style={{ boxShadow: isInstructor ? '0 0 30px rgba(16,185,129,0.35)' : '0 0 30px rgba(168,85,247,0.35)' }}
              >
                {/* Static gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${btnGrad} opacity-90 group-hover:opacity-100 transition-opacity`} />
                {/* Shimmer sweep */}
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeDasharray="30 10"/>
                        <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10"/>
                      </svg>
                      {t('auth.login.loading', 'Loading...')}
                    </>
                  ) : (
                    <>
                      {t('auth.create.createBtn')}
                      <svg className={`w-4 h-4 transition-transform duration-300 ${dir === 'rtl' ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Google Sign-In Button - Student Only */}
              {role === 'student' && (
                <>
                  {/* ── Divider ── */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* ── Google button ── */}
                  <button
                    type="button"
                    onClick={() => AuthService.loginWithGoogle()}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 text-white text-sm font-semibold transition-all duration-300 group hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C36.9 36.9 44 31.8 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}

              {/* ── Login link ── */}
              <p className="text-center text-xs text-slate-400 pt-1">
                {t('auth.create.alreadyHave')}{' '}
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); onNavigate('login') }}
                  className={`font-semibold transition-colors ${isInstructor ? 'text-emerald-400 hover:text-emerald-300' : 'text-purple-400 hover:text-purple-300'} hover:underline underline-offset-2`}
                >
                  {t('auth.create.loginHere')}
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateAccount
