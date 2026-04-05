import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Alert from '../components/Alert'
import './Login.css'
import './Register.css'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNo: '', department: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required.'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/register', form)
      login(data.user, data.token)
      navigate(data.user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Is the backend running on port 5000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card register-card">
        <div className="login-logo">
          <div className="logo-icon">📚</div>
          <h1>Create Account</h1>
          <p>Smart Attendance Tracker</p>
        </div>

        <form onSubmit={handleRegister} className="login-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Your full name" value={form.name} onChange={set('name')} disabled={loading} />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="Student: 23ad010@... / Teacher: ad010@..." value={form.email} onChange={set('email')} disabled={loading} />
          </div>
          <div className="reg-row">
            <div className="form-group">
              <label>Roll No</label>
              <input type="text" placeholder="e.g. 23AD010" value={form.rollNo} onChange={set('rollNo')} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input type="text" placeholder="e.g. AD" value={form.department} onChange={set('department')} disabled={loading} />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Create a password" value={form.password} onChange={set('password')} disabled={loading} />
          </div>

          <Alert type="error" message={error} onClose={() => setError('')} />

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
