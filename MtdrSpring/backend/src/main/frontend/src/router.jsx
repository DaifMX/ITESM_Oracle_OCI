import { lazy, Suspense, useState, useEffect } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import RootLayout from './layouts/RootLayout'
import { getAccessToken, getRefreshToken, refreshAccessToken } from './lib/auth'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const TodosPage = lazy(() => import('./pages/TodosPage'))

const pageFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-oracle-red" />
  </div>
)

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'denied'

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

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: 'login',
        element: <Suspense fallback={pageFallback}><LoginPage /></Suspense>,
      },
      {
        path: 'register',
        element: <Suspense fallback={pageFallback}><RegisterPage /></Suspense>,
      },
      {
        path: 'todos',
        element: (
          <ProtectedRoute>
            <Suspense fallback={pageFallback}><TodosPage /></Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
])

export default router
