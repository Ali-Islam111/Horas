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
import CookieBanner from './components/CookieBanner'

function App() {
  // Get initial page from URL or sessionStorage (survives refresh)
  const [page, setPage] = useState(() => getInitialPage())
  const examController = useExamController(setPage)

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
      {page === 'landing' && <LandingPage onNavigate={setPage} />}
      {page === 'login' && <Login onNavigate={setPage} />}
      {page === 'create' && <CreateAccount onNavigate={setPage} />}
      {page === 'googleCallback' && <GoogleCallback onNavigate={setPage} />}
      {page === 'dashboard' && <StudentDashboard onNavigate={setPage} examController={examController} />}
      {page === 'exam' && <StudentExam onNavigate={setPage} examController={examController} />}
      {page === 'examiner' && <ExaminerDashboard onNavigate={setPage} examController={examController} />}
      {page === 'report' && <ExamReportScreen onNavigate={setPage} examController={examController} />}
      {page === 'createExam' && <ExamCreation onNavigate={setPage} examController={examController} />}
      {page === 'examinerStudents' && <ExaminerStudents onNavigate={setPage} examController={examController} />}
      {page === 'examinerExam' && <ExaminerExam onNavigate={setPage} examController={examController} />}
      {page === 'examinerAlerts' && <ExaminerAlerts onNavigate={setPage} examController={examController} />}
      {page === 'examinerSettings' && <ExaminerSettings onNavigate={setPage} examController={examController} />}
      {page === 'examSubmission' && <ExamSubmission onNavigate={setPage} examController={examController} />}
      {page === 'proctoringMonitor' && <ProctoringMonitor onNavigate={setPage} examController={examController} />}
      <CookieBanner />
    </LanguageProvider>
  )
}

export default App
