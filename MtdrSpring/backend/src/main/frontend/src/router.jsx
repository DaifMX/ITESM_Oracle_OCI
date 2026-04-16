import { lazy, Suspense, useState, useEffect } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import RootLayout from './layouts/RootLayout'
import AppLayout from './layouts/AppLayout'
import { getAccessToken, getRefreshToken, refreshAccessToken, getUser } from './lib/auth'

// Public pages
const LoginPage = lazy(() => import('./pages/Login/LoginPage'))

// App pages (authenticated, wrapped in AppLayout)
const DashboardPage          = lazy(() => import('./pages/Dashboard/DashboardPage'))
const DeveloperDashboardPage = lazy(() => import('./pages/DeveloperDashboard/DeveloperDashboardPage'))
const ProjectsPage           = lazy(() => import('./pages/Projects/ProjectsPage'))
const SprintsPage            = lazy(() => import('./pages/Sprints/SprintsPage'))
const KanbanPage             = lazy(() => import('./pages/Kanban/KanbanPage'))
const UserManagementPage     = lazy(() => import('./pages/UserManagement/UserManagementPage'))

const pageFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-oracle-red" />
  </div>
)

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    if (getAccessToken()) {
      setStatus('ok')
    } else if (getRefreshToken()) {
      refreshAccessToken().then((token) => setStatus(token ? 'ok' : 'denied'))
    } else {
      setStatus('denied')
    }
  }, [])

  if (status === 'checking') return pageFallback
  if (status === 'denied') return <Navigate to="/login" replace />
  return children
}

// Only admin and manager can access user management
function ManagerRoute({ children }) {
  const user = getUser()
  if (user?.role === 'developer') return <Navigate to="/developer-dashboard" replace />
  return children
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (() => {
          const user = getUser()
          return <Navigate to={user?.role === 'developer' ? '/developer-dashboard' : '/dashboard'} replace />
        })(),
      },

      // Public
      {
        path: 'login',
        element: <Suspense fallback={pageFallback}><LoginPage /></Suspense>,
      },

      // Protected — all wrapped in AppLayout (sidebar, theme, logout)
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <Suspense fallback={pageFallback}><DashboardPage /></Suspense>,
          },
          {
            path: 'developer-dashboard',
            element: <Suspense fallback={pageFallback}><DeveloperDashboardPage /></Suspense>,
          },
          {
            path: 'projects',
            element: <Suspense fallback={pageFallback}><ProjectsPage /></Suspense>,
          },
          {
            path: 'projects/:projectId/sprints',
            element: <Suspense fallback={pageFallback}><SprintsPage /></Suspense>,
          },
          {
            path: 'projects/:projectId/sprints/:sprintId/board',
            element: <Suspense fallback={pageFallback}><KanbanPage /></Suspense>,
          },
          {
            path: 'user-management',
            element: (
              <ManagerRoute>
                <Suspense fallback={pageFallback}><UserManagementPage /></Suspense>
              </ManagerRoute>
            ),
          },
        ],
      },
    ],
  },
])

export default router
