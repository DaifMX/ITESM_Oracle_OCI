import { useNavigate } from 'react-router-dom'
import Login from '../components/Login'

export default function LoginPage() {
  const navigate = useNavigate()

  function handleLogin(role) {
    navigate(role === 'developer' ? '/developer-dashboard' : '/dashboard', { replace: true })
  }

  return <Login onLogin={handleLogin} />
}
