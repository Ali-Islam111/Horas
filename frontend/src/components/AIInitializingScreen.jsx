import React, { useEffect, useState } from 'react'

/**
 * AIInitializingScreen Component
 * Displays during AI proctoring engine initialization phase
 * Shows backend lifecycle: waiting → initializing → ready
 */
export default function AIInitializingScreen({ state = 'waiting' }) {
  const [dotCount, setDotCount] = useState(1)

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev === 3 ? 1 : prev + 1))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Get state-specific messaging
  const getStateInfo = () => {
    switch (state) {
      case 'waiting':
        return {
          title: 'Loading Proctoring Engine',
          subtitle: 'Please wait while we prepare secure monitoring...',
          icon: 'face',
        }
      case 'initializing':
        return {
          title: 'Calibrating AI Detectors',
          subtitle: 'Optimizing proctoring settings for your environment...',
          icon: 'settings',
        }
      case 'ready':
        return {
          title: 'Ready to Start',
          subtitle: 'AI proctoring is active and ready',
          icon: 'check',
        }
      case 'failed':
        return {
          title: 'Initialization Delayed',
          subtitle: 'Still trying to start proctoring. Please wait...',
          icon: 'loader',
        }
      default:
        return {
          title: 'Initializing AI',
          subtitle: 'Please wait...',
          icon: 'loader',
        }
    }
  }

  const stateInfo = getStateInfo()

  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30 font-sans flex items-center justify-center p-4">
      {/* Background Grid Pattern & Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

      {/* Ambient Glows */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-500/40 via-purple-500/30 to-emerald-500/30 blur-xl pointer-events-none" />

        <div className="relative rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
          {/* Top accent bar */}
          <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400" />

          <div className="p-8 text-center">
            {/* Icon Container */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Background animation */}
                {state !== 'ready' && (
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                )}

                {/* Icon circle */}
                <div className={`relative w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden
                  ${
                    state === 'ready'
                      ? 'border-emerald-500/50 bg-emerald-500/15'
                      : state === 'initializing'
                        ? 'border-purple-500/50 bg-purple-500/15'
                        : 'border-cyan-500/50 bg-cyan-500/15'
                  }`}>
                  {/* Icon SVG */}
                  {state === 'waiting' && (
                    <svg className="w-12 h-12 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {state === 'initializing' && (
                    <svg className="w-12 h-12 text-purple-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <path d="M12 2v6m6.66 1.34l-4.24 4.24m6 6l-4.24-4.24M12 20v-6m-6.66-1.34l4.24 4.24m-6-6l4.24-4.24" />
                    </svg>
                  )}
                  {state === 'ready' && (
                    <svg className="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-white text-2xl font-bold mb-3 tracking-tight">{stateInfo.title}</h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{stateInfo.subtitle}</p>

            {/* Loading dots (except when active) */}
            {state !== 'ready' && (
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3].map((dot) => (
                  <div
                    key={dot}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      dot <= dotCount
                        ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* State progression bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Initialization Progress
                </span>
                <span className="text-xs font-mono text-cyan-400/70">
                  {state === 'waiting' ? '25%' : state === 'initializing' ? '70%' : state === 'failed' ? '70%' : '100%'}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 bg-gradient-to-r ${
                    state === 'ready'
                      ? 'from-emerald-500 to-teal-400 w-full'
                      : state === 'initializing' || state === 'failed'
                        ? 'from-purple-500 to-cyan-400 w-2/3'
                        : 'from-cyan-500 to-purple-400 w-1/3'
                  }`}
                />
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p className="text-blue-300 text-xs leading-relaxed text-left">
                  AI is initializing to ensure fair exam proctoring. This typically takes 40-60 seconds.
                </p>
              </div>
            </div>

            {/* Camera status (if available through context) */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></div>
              <span>Camera active</span>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Do not move or close this window during initialization
        </p>
      </div>
    </div>
  )
}
