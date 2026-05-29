/**
 * Utility for mapping between URLs and app pages
 * Ensures SPA handles page state correctly on refresh
 */

const pageRoutes = {
  // Define URL to page mapping
  '/': 'landing',
  '/landing': 'landing',
  '/login': 'login',
  '/signup': 'create',
  '/create': 'create',
  '/auth/callback': 'googleCallback',
  '/dashboard': 'dashboard',
  '/exam': 'exam',
  '/examiner': 'examiner',
  '/dashboard/examiner': 'examiner',
  '/report': 'report',
  '/exam/report': 'report',
  '/create-exam': 'createExam',
  '/createExam': 'createExam',
  '/examiner/students': 'examinerStudents',
  '/examinerStudents': 'examinerStudents',
  '/examiner/exam': 'examinerExam',
  '/examinerExam': 'examinerExam',
  '/examiner/alerts': 'examinerAlerts',
  '/examinerAlerts': 'examinerAlerts',
  '/examiner/settings': 'examinerSettings',
  '/examinerSettings': 'examinerSettings',
  '/submission': 'examSubmission',
  '/exam/submission': 'examSubmission',
  '/examSubmission': 'examSubmission',
  '/proctoring': 'proctoringMonitor',
  '/proctoring-monitor': 'proctoringMonitor',
  '/proctoringMonitor': 'proctoringMonitor',
  '/demo-test': 'demoTest',
  '/demoTest': 'demoTest',
}

const pageToRoute = {
  landing: '/',
  login: '/login',
  create: '/signup',
  googleCallback: '/auth/callback',
  dashboard: '/dashboard',
  exam: '/exam',
  examiner: '/examiner',
  report: '/exam/report',
  createExam: '/create-exam',
  examinerStudents: '/examiner/students',
  examinerExam: '/examiner/exam',
  examinerAlerts: '/examiner/alerts',
  examinerSettings: '/examiner/settings',
  examSubmission: '/exam/submission',
  proctoringMonitor: '/proctoring',
  demoTest: '/demo-test',
}

/**
 * Get the current page from URL
 * @returns {string} page name or 'landing' as default
 */
export const getPageFromURL = () => {
  const pathname = window.location.pathname

  // Check exact matches first
  if (pageRoutes[pathname]) {
    return pageRoutes[pathname]
  }

  // Check prefix matches (for potential future nested routes)
  for (const [route, page] of Object.entries(pageRoutes)) {
    if (pathname.startsWith(route) && route !== '/') {
      return page
    }
  }

  // Default to landing if no match
  return 'landing'
}

/**
 * Update browser URL when page changes
 * @param {string} page - page name
 */
export const updateURLFromPage = (page) => {
  const route = pageToRoute[page] || '/'

  // Only update if URL is different to avoid unnecessary history entries
  if (window.location.pathname !== route) {
    window.history.pushState({ page }, document.title, route)
  }
}

/**
 * Get initial page (on app load)
 * Prioritize: OAuth callback → sessionStorage → URL → landing
 */
export const getInitialPage = () => {
  // Check for OAuth callback first
  if (window.location.pathname.startsWith('/auth/callback')) {
    return 'googleCallback'
  }

  // Try to restore from sessionStorage (survives page refresh within same tab)
  const savedPage = sessionStorage.getItem('currentPage')
  const knownPages = new Set(Object.values(pageRoutes))
  if (savedPage && knownPages.has(savedPage)) {
    return savedPage
  }

  // Get from URL
  return getPageFromURL()
}

/**
 * Save current page to sessionStorage for refresh recovery
 * @param {string} page - page name
 */
export const savePageToSession = (page) => {
  sessionStorage.setItem('currentPage', page)
}

export default {
  getPageFromURL,
  updateURLFromPage,
  getInitialPage,
  savePageToSession,
  pageRoutes,
  pageToRoute,
}
