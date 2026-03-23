import { useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE_URL } from '../config/api'
import logo from '../../assets/Untitled (1).png'
import { useLanguage } from '../contexts/LanguageContext'
import { connectProctoringWS } from '../services/proctoringService'

// ============================================
// Main Component: ProctoringMonitor
// ============================================
function ProctoringMonitor({ onNavigate }) {
  const { t, language, toggleLanguage } = useLanguage()

  // ── State ──────────────────────────────────────────────────────────────────
  const [wsStatus, setWsStatus]       = useState('connecting') // 'connecting' | 'connected' | 'disconnected'
  const [liveAlerts, setLiveAlerts]   = useState([])           // real-time alerts from AI
  const [cameraStatus, setCameraStatus] = useState('Initializing...')
  const [microphoneStatus, setMicrophoneStatus] = useState('Initializing...')
  const [error, setError]             = useState(null)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef          = useRef(null)
  const streamRef         = useRef(null)
  const wsRef             = useRef(null)   // { sendFrame, close, ws }
  const frameIntervalRef  = useRef(null)

  // Get session_id stored when the student enrolled
  const sessionId = localStorage.getItem('session_id') || localStorage.getItem('current_session_id')

  // ============================================
  // Initialize Camera
  // ============================================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStatus('Active')
        setMicrophoneStatus('Active')
      }
    } catch (err) {
      console.error('[Proctoring] Camera error:', err)
      setError(`Camera access failed: ${err.message}`)
      setCameraStatus('Failed')
    }
  }

  // ============================================
  // Connect WebSocket & Start Frame Streaming
  // ============================================
  const startProctoring = useCallback(() => {
    if (!sessionId) {
      console.warn('[Proctoring] No session_id found in localStorage — skipping WS connection')
      setError('No active session found. Please start an exam first.')
      setWsStatus('disconnected')
      return
    }

    wsRef.current = connectProctoringWS(sessionId, {
      onOpen: () => {
        setWsStatus('connected')
        setError(null)

        // Send one frame per second to the AI engine
        frameIntervalRef.current = setInterval(() => {
          if (videoRef.current && wsRef.current) {
            wsRef.current.sendFrame(videoRef.current, 0.7)
          }
        }, 350)
      },

      onAlert: (alertData) => {
        // alertData = { type: 'alert', category: string, message: string }
        setLiveAlerts(prev => [{
          id: Date.now(),
          category: alertData.category || 'AI',
          message:  alertData.message  || 'Violation detected',
          time:     new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 50))  // keep last 50
      },

      onClose: () => {
        setWsStatus('disconnected')
        clearInterval(frameIntervalRef.current)
      },

      onError: () => {
        setWsStatus('disconnected')
        setError('AI proctoring connection failed. Check that the backend is running.')
      },
    })
  }, [sessionId])

  // ============================================
  // Lifecycle: mount / unmount
  // ============================================
  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(frameIntervalRef.current)
    }
  }, [])

  // Start WebSocket once camera is ready
  useEffect(() => {
    if (cameraStatus === 'Active') {
      startProctoring()
    }
    return () => {
      wsRef.current?.close()
      clearInterval(frameIntervalRef.current)
    }
  }, [cameraStatus, startProctoring])

  // ============================================
  // Helpers
  // ============================================
  const getCategoryColor = (category = '') => {
    const c = category.toUpperCase()
    if (c.includes('YOLO'))    return { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
    if (c.includes('EYE') || c.includes('HEAD')) return { dot: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' }
    return { dot: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' }
  }

  const wsStatusBadge = {
    connecting:   { label: 'Connecting...',     color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
    connected:    { label: 'AI Active',         color: 'text-emerald-400', dot: 'bg-emerald-400' },
    disconnected: { label: 'Disconnected',      color: 'text-red-400',    dot: 'bg-red-400' },
  }[wsStatus]

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30">

      {/* Background */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[150px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-2xl px-6 py-4 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-cyan-500 via-purple-500 to-emerald-500 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-2">
                <img src={logo} alt="Horus" className="w-full h-full object-contain drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">AI Proctoring Monitor</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Session ID: <span className="text-cyan-400 font-mono">{sessionId || 'None'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* WS Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm">
              <span className={`w-2 h-2 rounded-full ${wsStatusBadge.dot}`} />
              <span className={wsStatusBadge.color}>{wsStatusBadge.label}</span>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md hidden sm:block"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: Camera Feed ─────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Camera', value: cameraStatus, color: cameraStatus === 'Active' ? 'text-emerald-400' : 'text-red-400' },
                { label: 'AI Engine', value: wsStatus === 'connected' ? 'Online' : wsStatus === 'connecting' ? 'Starting' : 'Offline', color: wsStatus === 'connected' ? 'text-emerald-400' : wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400' },
                { label: 'Alerts', value: liveAlerts.length, color: liveAlerts.length > 0 ? 'text-red-400' : 'text-slate-300' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Live Camera */}
            <div className="rounded-2xl border border-purple-500/40 bg-white/5 backdrop-blur-md overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)]">
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* LIVE badge */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">LIVE AI</span>
                </div>

                {/* WS Status overlay */}
                <div className="absolute top-4 right-4 z-20">
                  <span className={`text-xs font-bold px-2 py-1 rounded backdrop-blur-sm border ${wsStatus === 'connected' ? 'text-emerald-400 border-emerald-500/40 bg-black/60' : 'text-red-400 border-red-500/40 bg-black/60'}`}>
                    {wsStatus === 'connected' ? '● AI ACTIVE' : wsStatus === 'connecting' ? '◌ CONNECTING' : '✕ OFFLINE'}
                  </span>
                </div>

                {cameraStatus !== 'Active' && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center flex-col">
                    <svg className="w-8 h-8 text-slate-500 mb-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    <p className="text-slate-400 text-xs font-semibold tracking-wider">INITIALIZING CAMERA...</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-950/80 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Live Camera Feed → AI Engine</p>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span className={`flex items-center gap-1 ${cameraStatus === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      {cameraStatus}
                    </span>
                    <span className={`flex items-center gap-1 ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" /></svg>
                      WebSocket {wsStatus}
                    </span>
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
              </div>
            </div>
          </div>

          {/* ── Right: Live Alert Log ──────────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-white text-lg font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              Live AI Alerts
              {liveAlerts.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{liveAlerts.length}</span>
              )}
            </h2>

            <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
              <div className="overflow-y-auto flex-grow p-4 space-y-3">

                {/* Empty state */}
                {liveAlerts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <p className="text-emerald-400 text-sm font-semibold">All Clear</p>
                    <p className="text-slate-500 text-xs mt-1">No violations detected yet</p>
                  </div>
                )}

                {/* Alert cards */}
                {liveAlerts.map((alert) => {
                  const style = getCategoryColor(alert.category)
                  return (
                    <div key={alert.id} className={`rounded-xl border p-3 ${style.bg}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${style.dot} animate-pulse`} />
                          <span className={`font-semibold text-sm ${style.text}`}>{alert.category}</span>
                        </div>
                        <span className="text-slate-500 text-xs">{alert.time}</span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1.5 ml-4">{alert.message}</p>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="bg-slate-950/80 p-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">AI Backend Connection</span>
                  <span className={`flex items-center gap-1.5 font-semibold ${wsStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {wsStatus === 'connected' ? 'Connected & Active' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default ProctoringMonitor
