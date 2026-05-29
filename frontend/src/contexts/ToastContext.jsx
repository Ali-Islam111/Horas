import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast container floating in viewport */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard = ({ toast, onDismiss }) => {
  const { id, message, type } = toast;
  
  // Icon and theme mapping
  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          glow: 'from-emerald-500/20 to-teal-500/20 shadow-emerald-500/20 border-emerald-500/30',
          text: 'text-emerald-400',
          progress: 'bg-emerald-500',
          icon: (
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'warning':
        return {
          glow: 'from-amber-500/20 to-orange-500/20 shadow-amber-500/20 border-amber-500/30',
          text: 'text-amber-400',
          progress: 'bg-amber-500',
          icon: (
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        };
      case 'info':
        return {
          glow: 'from-cyan-500/20 to-blue-500/20 shadow-cyan-500/20 border-cyan-500/30',
          text: 'text-cyan-400',
          progress: 'bg-cyan-500',
          icon: (
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'error':
      default:
        return {
          glow: 'from-red-500/20 to-rose-500/20 shadow-red-500/20 border-red-500/30',
          text: 'text-red-400',
          progress: 'bg-red-500',
          icon: (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`relative w-full rounded-xl border p-4 shadow-lg backdrop-blur-xl bg-slate-950/80 pointer-events-auto flex items-start gap-3 transition-all duration-300 transform translate-x-0 animate-fade-slide-up border-[1px] ${theme.glow}`}
      style={{
        animation: 'fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">{theme.icon}</div>

      {/* Message */}
      <div className="flex-1 flex flex-col pr-6">
        <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{type}</span>
        <p className="text-slate-200 text-sm mt-1 font-medium leading-relaxed break-words">{message}</p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Sliding Progress Bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-xl overflow-hidden pointer-events-none">
        <div
          className={`h-full ${theme.progress}`}
          style={{
            animation: `toastProgress ${toast.duration}ms linear forwards`,
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  );
};
