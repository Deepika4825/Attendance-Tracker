import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Alert from '../components/Alert'
import './MarkAttendance.css'

export default function MarkAttendance() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState(null)       // { subject, expiresAt }
  const [sessionError, setSessionError] = useState('')
  const [rollNo, setRollNo] = useState(user?.rollNo || '')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [timeLeft, setTimeLeft] = useState(null)

  // Fetch session info on mount
  useEffect(() => {
    if (!token) { setSessionError('No QR token found in URL.'); return }
    api.get(`/qr-session/${token}`)
      .then(({ data }) => {
        setSession(data)
        const secs = Math.max(0, Math.floor((new Date(data.expiresAt) - Date.now()) / 1000))
        setTimeLeft(secs)
      })
      .catch((err) => {
        setSessionError(err.response?.data?.message || 'Invalid or expired QR code.')
      })
  }, [token])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { setSessionError('This QR code has expired.'); setSession(null); return }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { navigate(`/login?redirect=/mark-attendance?token=${token}`); return }
    if (!rollNo.trim()) { setMsg({ type: 'error', text: 'Please enter your roll number.' }); return }

    setSubmitting(true); setMsg({ type: '', text: '' })
    try {
      const { data: res } = await api.post('/mark-attendance', { token, rollNo: rollNo.trim() })
      setMsg({ type: 'success', text: res.message })
    } catch (err) {
      const status = err.response?.status
      setMsg({
        type: status === 410 ? 'warning' : 'error',
        text: err.response?.data?.message || 'Failed to mark attendance.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mark-bg">
      <div className="mark-card">
        <div className="mark-logo">
          <div className="logo-icon">📚</div>
          <h1>Mark Attendance</h1>
          <p>Smart Attendance Tracker</p>
        </div>

        {sessionError ? (
          <div className="mark-error-state">
            <span className="mark-error-icon">⚠️</span>
            <p>{sessionError}</p>
            {user && (
              <button className="btn-primary" onClick={() => navigate(user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard')}>
                Go to Dashboard
              </button>
            )}
          </div>
        ) : session ? (
          <>
            <div className="mark-session-info">
              <div className="mark-subject">
                {session.className ? `${session.className} — ` : ''}{session.subject}
              </div>
              <div className={`mark-timer ${timeLeft <= 10 ? 'timer-urgent' : ''}`}>
                ⏱ {timeLeft}s remaining
              </div>
            </div>

            {msg.type === 'success' ? (
              <div className="mark-success">
                <span>✅</span>
                <p>{msg.text}</p>
                {user && (
                  <button className="btn-primary" style={{ marginTop: '1rem' }}
                    onClick={() => navigate('/student-dashboard')}>
                    Go to Dashboard
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mark-form">
                {!user && (
                  <Alert type="info" message="You need to be logged in to mark attendance." />
                )}

                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="input-readonly"
                    placeholder="Login to auto-fill"
                  />
                </div>

                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 23AD010"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    disabled={submitting || !user}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" value={session.subject} readOnly className="input-readonly" />
                </div>

                <Alert type={msg.type} message={msg.text} onClose={() => setMsg({ type: '', text: '' })} />

                {user ? (
                  <button type="submit" className="btn-primary mark-submit" disabled={submitting || timeLeft <= 0}>
                    {submitting ? 'Submitting...' : '✅ Submit Attendance'}
                  </button>
                ) : (
                  <button type="button" className="btn-primary mark-submit"
                    onClick={() => navigate(`/login?redirect=/mark-attendance?token=${token}`)}>
                    Login to Mark Attendance
                  </button>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="mark-loading">
            <div className="spinner" />
            <p>Verifying QR code...</p>
          </div>
        )}
      </div>
    </div>
  )
}
