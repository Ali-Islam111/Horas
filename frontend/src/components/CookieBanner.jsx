import { useState, useEffect } from 'react'

const COOKIE_KEY = 'horas_cookie_consent'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function getConsentValue() {
  const cookiePair = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_KEY}=`))

  if (cookiePair) {
    return decodeURIComponent(cookiePair.split('=')[1])
  }

  return localStorage.getItem(COOKIE_KEY)
}

function setConsentValue(value) {
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
  localStorage.setItem(COOKIE_KEY, value)
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const savedConsent = getConsentValue()

    if (!savedConsent) {
      const t = setTimeout(() => setVisible(true), 900)
      return () => clearTimeout(t)
    }

    if (!document.cookie.includes(`${COOKIE_KEY}=`)) {
      setConsentValue(savedConsent)
    }
  }, [])

  const dismiss = (choice) => {
    setConsentValue(choice)
    setLeaving(true)
    setTimeout(() => setVisible(false), 500)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] w-80
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${leaving
          ? 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
        }`}
    >
      {/* Ambient glow behind card */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-purple-600/20 via-transparent to-cyan-600/20 blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d0d1a]/95 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden">

        {/* Coloured top strip */}
        <div className="relative h-1 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400" />
          {/* Animated shine on the strip */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
        </div>

        <div className="p-5">
          {/* Icon + heading row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              {/* Soft glow behind icon */}
              <div className="absolute inset-0 rounded-xl bg-purple-500/30 blur-md" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center select-none text-lg">
                🍪
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight leading-tight">Cookie Preferences</h3>
              <p className="text-slate-500 text-[10px] font-medium mt-0.5 uppercase tracking-widest">Horas Platform</p>
            </div>

            {/* X */}
            <button
              onClick={() => dismiss('declined')}
              className="ml-auto w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90 flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-3" />

          {/* Description */}
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            This website uses cookies to ensure you get the best experience on our site. We use cookies to improve functionality, measure performance, and support personalized content.
          </p>

          {/* Cookie type pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[
              { label: 'Essential', color: 'emerald' },
              { label: 'Functional', color: 'cyan' },
              { label: 'Proctoring', color: 'purple' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                  ${color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : ''}
                  ${color === 'cyan'    ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'       : ''}
                  ${color === 'purple'  ? 'bg-purple-500/10 border-purple-500/25 text-purple-400' : ''}
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${color === 'emerald' ? 'bg-emerald-400' : ''}
                  ${color === 'cyan'    ? 'bg-cyan-400'    : ''}
                  ${color === 'purple'  ? 'bg-purple-400'  : ''}
                `} />
                {label}
              </span>
            ))}
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            {/* Accept All — primary */}
            <button
              onClick={() => dismiss('accepted')}
              className="w-full relative group py-2.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              {/* Shimmer */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Accept All
              </span>
            </button>

            {/* Bottom row: Reject + Cookie Policy */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => dismiss('declined')}
                className="py-2 rounded-xl bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.07] hover:border-red-500/30 text-slate-400 hover:text-red-400 font-semibold text-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Reject
              </button>
              <button
                onClick={() => window.open('/cookie-policy', '_blank')}
                className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/[0.07] hover:border-white/20 text-slate-400 hover:text-white font-semibold text-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] flex items-center justify-center gap-1.5"
              >
                <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
