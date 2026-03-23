import React, { useEffect, useState } from 'react';
import AuthService from '../services/authService';
import { API_BASE_URL } from '../config/api';

/**
 * GoogleCallback View (Controller + View)
 * 
 * This page handles the redirect from the backend after Google OAuth completes.
 * The backend redirects to: FRONTEND_URL/auth/callback?token=JWT_TOKEN
 * 
 * This component:
 * 1. Reads the ?token= query param
 * 2. Stores it in localStorage via AuthService
 * 3. Navigates the user to their dashboard
 */
function GoogleCallback({ onNavigate }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const token = AuthService.extractGoogleCallbackToken();

      if (!token) {
        setError('Google authentication failed. No token received.');
        return;
      }

      try {
        const profileResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const profileData = profileResponse.ok
          ? await profileResponse.json()
          : null;

        const role = profileData?.role || 'student';

        AuthService.setSession(token, role);
        window.history.replaceState({}, document.title, window.location.pathname);

        if (role === 'teacher') {
          onNavigate('examiner');
        } else {
          onNavigate('dashboard');
        }
      } catch {
        AuthService.setSession(token, 'student');
        window.history.replaceState({}, document.title, window.location.pathname);
        onNavigate('dashboard');
      }
    };

    handleGoogleCallback();
  }, [onNavigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030014] text-slate-200">
      <div className="text-center">
        {!error ? (
          <>
            {/* Animated spinner */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin" />
            </div>
            <p className="text-lg font-semibold text-white">Signing you in with Google...</p>
            <p className="text-sm text-slate-400 mt-2">Please wait a moment</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-red-400">{error}</p>
            <button
              onClick={() => onNavigate('login')}
              className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-all"
            >
              Go back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GoogleCallback;
