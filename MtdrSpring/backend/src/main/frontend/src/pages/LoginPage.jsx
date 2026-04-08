import { useNavigate } from 'react-router-dom'
import Login from '../components/Login'

export default function LoginPage() {
  const navigate = useNavigate()
  return <Login onLogin={() => navigate('/dashboard')} />
}
