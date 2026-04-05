import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-icon">📚</span>
        <span className="navbar-title">Smart Attendance Tracker</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-badge">
          {user?.role === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
        </span>
        <span className="navbar-email">{user?.email}</span>
        <button className="navbar-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
