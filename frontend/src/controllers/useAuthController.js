import { useState } from 'react';
import AuthService from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * AuthController (Controller Layer)
 * Manages local UI state for authentication components.
 * Invokes AuthService to execute API requests, updates state accordingly,
 * and passes clean variables back to the View.
 */
export function useAuthController(onNavigate) {
  const { t } = useLanguage();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'instructor'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Registration Specific State
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [institution, setInstitution] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  /**
   * Used in Login View to animate the role switch.
   */
  const handleRoleChange = (newRole) => {
    if (newRole === role) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setRole(newRole);
      setIsTransitioning(false);
    }, 300);
  };

  /**
   * Action: Logs the user in
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const data = await AuthService.login(email, password);
      
      // Fetch true role from backend database instead of relying on frontend toggle
      const profile = await AuthService.getProfile(data.access_token);
      const trueRole = profile.role;

      // Reject if they tried to log into instructor portal but are a student
      if (role === 'instructor' && trueRole !== 'teacher') {
        AuthService.clearSession();
        setLoginError('Your account does not have instructor privileges. Please register as an instructor or login as a student.');
        setIsLoading(false);
        return;
      }

      AuthService.setSession(data.access_token, trueRole);

      if (trueRole === 'teacher') {
        onNavigate('examiner');
      } else {
        onNavigate('dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Registers a new user
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError(null);

    if (password !== confirmPassword) {
      setRegisterError(t('auth.create.passwordMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      // Map UI role 'instructor' → backend role 'teacher'
      const backendRole = role === 'instructor' ? 'teacher' : 'student';
      await AuthService.register(email, fullName, password, backendRole);
      
      setRegisterSuccess(true);
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state: {
      email,
      password,
      role,
      isTransitioning,
      isLoading,
      loginError,
      fullName,
      studentId,
      department,
      institution,
      confirmPassword,
      registerError,
      registerSuccess
    },
    actions: {
      setEmail,
      setPassword,
      setFullName,
      setStudentId,
      setDepartment,
      setInstitution,
      setConfirmPassword,
      handleRoleChange,
      handleLogin,
      handleRegister
    }
  };
}
