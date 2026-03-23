import { useState } from 'react'
import './App.css'
import { LanguageProvider } from './contexts/LanguageContext'
import { useExamController } from './controllers/useExamController'
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

// Detect if browser was redirected here from Google OAuth callback
const isGoogleCallback = window.location.pathname.startsWith('/auth/callback')

function App() {
  const [page, setPage] = useState(isGoogleCallback ? 'googleCallback' : 'landing')
  const examController = useExamController(setPage)

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
    </LanguageProvider>
  )
}

export default App
