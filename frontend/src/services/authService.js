import { API_BASE_URL } from '../config/api';

/**
 * AuthService (Model/Service Layer)
 * Responsible only for making HTTP requests to the backend authentication endpoints.
 * It does not manage React state or handle UI routing.
 */
class AuthService {
  /**
   * Logs a user in by sending URL-encoded form data.
   * @param {string} email 
   * @param {string} password 
   * @returns {Object} { access_token, token_type }
   */
  static async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    return await response.json();
  }

  /**
   * Registers a new user.
   * @param {string} email 
   * @param {string} fullName 
   * @param {string} password 
   * @param {string} role 
   * @returns {Object} The created user object
   */
  static async register(email, fullName, password, role = 'student') {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        full_name: fullName,
        password: password,
        role: role,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }

    return await response.json();
  }

  /**
   * Redirects the browser to the backend Google OAuth endpoint.
   * The backend (FastAPI) handles the full OAuth2 flow and
   * eventually redirects back to FRONTEND_URL/auth/callback?token=JWT
   */
  static loginWithGoogle() {
    // Navigate the browser directly to the backend Google OAuth entry point.
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  }

  /**
   * Called on the /auth/callback page after Google redirects back.
   * Extracts the JWT token from the URL query parameters.
   * @returns {string|null} The JWT token if present, otherwise null.
   */
  static extractGoogleCallbackToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }

  /**
   * Helper to store the auth token and role.
   */
  static setSession(token, role) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_role', role);
  }

  /**
   * Helper to clear the session (Logout).
   */
  static clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
  }

  /**
   * Get the current stored token.
   */
  static getToken() {
    return localStorage.getItem('auth_token');
  }
}

export default AuthService;
