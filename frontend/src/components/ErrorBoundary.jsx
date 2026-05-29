import React, { Component } from 'react';
import logo from '../../assets/Untitled (1).png';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDiagnostics: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error('💥 [ErrorBoundary] Unhandled UI Exception caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('current_session_id');
    localStorage.removeItem('session_id');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030014] text-slate-200 overflow-hidden relative selection:bg-purple-500/30 font-sans flex items-center justify-center p-4">
          {/* Background Grid Pattern & Noise */}
          <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>

          {/* Ambient Glows */}
          <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none z-0" />

          {/* Main Card */}
          <div className="relative z-10 w-full max-w-lg">
            {/* Glow effect */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-red-500/40 via-purple-500/20 to-cyan-500/20 blur-xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
              {/* Top accent bar */}
              <div className="h-[2px] w-full bg-gradient-to-r from-red-400 via-purple-400 to-cyan-400" />

              <div className="p-8 text-center">
                {/* Logo & Warning Icon */}
                <div className="flex justify-center mb-6 gap-3 items-center">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-red-500 to-purple-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]">
                    <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center p-2">
                      <img src={logo} alt="Horus" className="w-full h-full object-contain drop-shadow-lg" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full border-2 border-red-500/40 bg-red-500/15 flex items-center justify-center overflow-hidden">
                      <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-white text-2xl font-bold mb-3 tracking-tight">Something Went Wrong</h1>

                {/* Subtitle */}
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  An unhandled UI error has occurred. Your current session status is preserved, and you can try recovering using the options below.
                </p>

                {/* Main recovery actions */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 relative group py-3 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg"
                    style={{ boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
                      </svg>
                      Reload App
                    </span>
                  </button>

                  <button
                    onClick={this.handleReset}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Clear Cache & Home
                  </button>
                </div>

                {/* Diagnostic accordion */}
                <div className="rounded-xl border border-white/5 bg-slate-900/40 overflow-hidden text-left">
                  <button
                    onClick={() => this.setState((prev) => ({ showDiagnostics: !prev.showDiagnostics }))}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Technical Diagnostics</span>
                    <svg
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${this.state.showDiagnostics ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {this.state.showDiagnostics && (
                    <div className="p-4 font-mono text-[10px] text-red-400/90 max-h-[160px] overflow-y-auto pr-2 select-text whitespace-pre-wrap leading-normal break-all">
                      <span className="font-bold text-white block mb-1">Error Name:</span>
                      {this.state.error ? this.state.error.toString() : 'Unknown Error'}
                      {this.state.errorInfo && (
                        <>
                          <span className="font-bold text-white block mt-3 mb-1">Stack Trace:</span>
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
