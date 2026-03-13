import { useNavigate } from 'react-router-dom'
import Register from '../components/Register'

export default function RegisterPage() {
  const navigate = useNavigate()
  return <Register onRegister={() => navigate('/login')} />
}
