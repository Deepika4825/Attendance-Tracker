import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Alert from '../components/Alert'
import './Login.css'
import './ForgotPassword.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = enter email+roll, 2 = set new password, 3 = done
  const [email, setEmail] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!email || !rollNo) { setError('Both fields are required.'); return }
    // Just move to step 2 — actual verification happens on reset
    setError('')
    setStep(2)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) { setError('Please fill in both password fields.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true); setError('')
    try {
      await api.post('/forgot-password', { email, rollNo, newPassword })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🔑</div>
          <h1>Forgot Password</h1>
          <p>Smart Attendance Tracker</p>
        </div>

        {/* Step indicator */}
        <div className="fp-steps">
          <div className={`fp-step ${step >= 1 ? 'active' : ''}`}>1. Verify</div>
          <div className="fp-step-line" />
          <div className={`fp-step ${step >= 2 ? 'active' : ''}`}>2. Reset</div>
          <div className="fp-step-line" />
          <div className={`fp-step ${step >= 3 ? 'active' : ''}`}>3. Done</div>
        </div>

        {step === 1 && (
          <form onSubmit={handleVerify} className="login-form">
            <p className="fp-hint">Enter your registered email and roll number to verify your identity.</p>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Roll Number</label>
              <input
                type="text"
                placeholder="e.g. 23AD010"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                disabled={loading}
              />
            </div>
            <Alert type="error" message={error} onClose={() => setError('')} />
            <button type="submit" className="login-btn" disabled={loading}>
              Verify Identity
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="login-form">
            <p className="fp-hint">Set a new password for <strong>{email}</strong></p>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Alert type="error" message={error} onClose={() => setError('')} />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button type="button" className="fp-back" onClick={() => { setStep(1); setError('') }}>
              ← Back
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="fp-success">
            <span>✅</span>
            <h3>Password Reset!</h3>
            <p>Your password has been updated successfully.</p>
            <button className="login-btn" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        )}

        {step !== 3 && (
          <p className="login-footer">
            Remember your password? <Link to="/login">Login</Link>
          </p>
        )}
      </div>
    </div>
  )
}
