import { useState, useEffect } from 'react'
import './App.css'
import { LanguageProvider } from './contexts/LanguageContext'
import { useExamController } from './controllers/useExamController'
import { getInitialPage, updateURLFromPage, savePageToSession } from './utils/routeMapping'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import CreateAccount from './components/CreateAccount'
import GoogleCallback from './components/GoogleCallback'
import StudentDashboard from './components/StudentDashboard'
import StudentExam from './components/StudentExam'
import ExaminerDashboard from './components/ExaminerDashboard'
import ExamReportScreen from './components/ExamReportScreen'
import ExamCreation from './components/ExamCreation'
import ExaminerStudents from './components/ExaminerStudents'
import ExaminerExam from './components/ExaminerExam'
import ExaminerAlerts from './components/ExaminerAlerts'
import ExaminerSettings from './components/ExaminerSettings'
import ExamSubmission from './components/ExamSubmission'
import ProctoringMonitor from './components/ProctoringMonitor'
import AIDemoTest from './components/AIDemoTest'
import CookieBanner from './components/CookieBanner'

function App() {
  // Get initial page from URL or sessionStorage (survives refresh)
  const [page, setPage] = useState(() => getInitialPage())

  const handleNavigate = (newPage) => {
    if (newPage === 'login') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      sessionStorage.removeItem('currentPage');
    }
    setPage(newPage);
  }

  const examController = useExamController(handleNavigate)

  // Route Guards based on authentication and roles
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const role = localStorage.getItem('user_role')

    const studentPages = ['dashboard', 'exam', 'examSubmission']
    const teacherPages = [
      'examiner',
      'report',
      'createExam',
      'examinerStudents',
      'examinerExam',
      'examinerAlerts',
      'examinerSettings',
      'proctoringMonitor'
    ]
    const publicPages = ['landing', 'login', 'create', 'googleCallback', 'demoTest']

    if (!token) {
      // If not logged in, only allow public pages
      if (!publicPages.includes(page)) {
        setPage('login')
      }
    } else {
      // If logged in
      if (role === 'teacher') {
        // Teacher role: prevent accessing student pages
        if (studentPages.includes(page)) {
          setPage('examiner')
        }
      } else if (role === 'student') {
        // Student role: prevent accessing teacher pages
        if (teacherPages.includes(page)) {
          setPage('dashboard')
        }
      }
    }
  }, [page])

  // Update URL when page changes (for browser history and deep linking)
  useEffect(() => {
    updateURLFromPage(page)
    savePageToSession(page)
  }, [page])

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.page) {
        setPage(event.state.page)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <LanguageProvider>
      {page === 'landing' && <LandingPage onNavigate={handleNavigate} />}
      {page === 'login' && <Login onNavigate={handleNavigate} />}
      {page === 'create' && <CreateAccount onNavigate={handleNavigate} />}
      {page === 'googleCallback' && <GoogleCallback onNavigate={handleNavigate} />}
      {page === 'dashboard' && <StudentDashboard onNavigate={handleNavigate} examController={examController} />}
      {page === 'exam' && <StudentExam onNavigate={handleNavigate} examController={examController} />}
      {page === 'examiner' && <ExaminerDashboard onNavigate={handleNavigate} examController={examController} />}
      {page === 'report' && <ExamReportScreen onNavigate={handleNavigate} examController={examController} />}
      {page === 'createExam' && <ExamCreation onNavigate={handleNavigate} examController={examController} />}
      {page === 'examinerStudents' && <ExaminerStudents onNavigate={handleNavigate} examController={examController} />}
      {page === 'examinerExam' && <ExaminerExam onNavigate={handleNavigate} examController={examController} />}
      {page === 'examinerAlerts' && <ExaminerAlerts onNavigate={handleNavigate} examController={examController} />}
      {page === 'examinerSettings' && <ExaminerSettings onNavigate={handleNavigate} examController={examController} />}
      {page === 'examSubmission' && <ExamSubmission onNavigate={handleNavigate} examController={examController} />}
      {page === 'proctoringMonitor' && <ProctoringMonitor onNavigate={handleNavigate} examController={examController} />}
      {page === 'demoTest' && <AIDemoTest onNavigate={handleNavigate} />}
      <CookieBanner />
    </LanguageProvider>
  )
}

export default App
