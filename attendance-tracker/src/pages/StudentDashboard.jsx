import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import './StudentDashboard.css'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Activity upload state
  const [actTitle, setActTitle] = useState('')
  const [actDate, setActDate] = useState('')
  const [actDesc, setActDesc] = useState('')
  const [actProof, setActProof] = useState(null)
  const [actLoading, setActLoading] = useState(false)
  const [actMsg, setActMsg] = useState({ type: '', text: '' })
  const proofRef = useRef(null)

  // QR mark attendance state
  const [qrToken, setQrToken] = useState('')
  const [qrMsg, setQrMsg] = useState({ type: '', text: '' })
  const [qrLoading, setQrLoading] = useState(false)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/student/dashboard')
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  const handleActivitySubmit = async (e) => {
    e.preventDefault()
    if (!actTitle || !actDate) { setActMsg({ type: 'error', text: 'Title and date are required.' }); return }
    setActLoading(true); setActMsg({ type: '', text: '' })
    try {
      const form = new FormData()
      form.append('title', actTitle)
      form.append('date', actDate)
      form.append('description', actDesc)
      if (actProof) form.append('proof', actProof)

      await api.post('/activity/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setActMsg({ type: 'success', text: 'Activity submitted! Awaiting class teacher approval.' })
      setActTitle(''); setActDate(''); setActDesc(''); setActProof(null)
      if (proofRef.current) proofRef.current.value = ''
      fetchDashboard()
    } catch (err) {
      setActMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' })
    } finally {
      setActLoading(false)
    }
  }

  const handleMarkAttendance = async (e) => {
    e.preventDefault()
    if (!qrToken.trim()) { setQrMsg({ type: 'error', text: 'Please enter the QR token.' }); return }
    setQrLoading(true); setQrMsg({ type: '', text: '' })
    try {
      const { data: res } = await api.post('/mark-attendance', { token: qrToken.trim() })
      setQrMsg({ type: 'success', text: res.message })
      setQrToken('')
      fetchDashboard()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance.'
      setQrMsg({ type: err.response?.status === 410 ? 'warning' : 'error', text: msg })
    } finally {
      setQrLoading(false)
    }
  }

  if (loading) return <div className="dashboard-layout"><Navbar /><Spinner text="Loading dashboard..." /></div>
  if (error) return <div className="dashboard-layout"><Navbar /><div style={{ padding: '2rem' }}><Alert type="error" message={error} /></div></div>

  const { stats, subjectSummary, attendanceHistory, activities, activityGraph } = data

  return (
    <div className="dashboard-layout">
      <Navbar />
      <main className="dashboard-main">

        {/* Welcome */}
        <div className="welcome-banner">
          <div>
            <h2>Welcome back, {user?.name || user?.email} 👋</h2>
            <p>Here's your attendance overview for this semester.</p>
          </div>
          <div className="welcome-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon="📅" label="Total Classes" value={stats.totalClasses} color="blue" />
          <StatCard icon="✅" label="Classes Attended" value={stats.attended} color="green" />
          <StatCard icon="❌" label="Classes Missed" value={stats.missed} color="red" />
          <StatCard icon="📊" label="Overall %" value={`${stats.overallPercent}%`} color="yellow" />
        </div>

        <div className="dashboard-grid">

          {/* Subject Summary */}
          <Card title="Subject-wise Attendance">
            {subjectSummary.length === 0
              ? <p className="empty-msg">No attendance records yet.</p>
              : <table className="data-table">
                  <thead><tr><th>Subject</th><th>Attended</th><th>Total</th><th>%</th><th>Status</th></tr></thead>
                  <tbody>
                    {subjectSummary.map((row) => (
                      <tr key={row.subject}>
                        <td>{row.subject}</td>
                        <td>{row.attended}</td>
                        <td>{row.total}</td>
                        <td>
                          <div className="progress-wrap">
                            <div className="progress-bar" style={{ width: `${row.percent}%`, background: row.percent >= 75 ? 'var(--green)' : 'var(--red)' }} />
                            <span>{row.percent}%</span>
                          </div>
                        </td>
                        <td><span className={`badge ${row.percent >= 75 ? 'badge-green' : 'badge-red'}`}>{row.percent >= 75 ? 'Safe' : 'Low'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Card>

          {/* Mark Attendance via QR Token */}
          <Card title="Mark Attendance (QR Token)">
            <form onSubmit={handleMarkAttendance} className="activity-form">
              <div className="form-group">
                <label>Enter QR Token from Teacher</label>
                <input
                  type="text"
                  placeholder="Paste the token here"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  disabled={qrLoading}
                />
              </div>
              <Alert type={qrMsg.type} message={qrMsg.text} onClose={() => setQrMsg({ type: '', text: '' })} />
              <button type="submit" className="btn-primary" disabled={qrLoading}>
                {qrLoading ? 'Marking...' : '✅ Mark Attendance'}
              </button>
            </form>
          </Card>

          {/* Activity Upload */}
          <Card title="Upload Activity">
            <form onSubmit={handleActivitySubmit} className="activity-form">
              <div className="form-group">
                <label>Activity Title</label>
                <input type="text" placeholder="e.g. Hackathon, Paper Presentation" value={actTitle} onChange={(e) => setActTitle(e.target.value)} disabled={actLoading} />
              </div>
              <div className="form-group">
                <label>Activity Date</label>
                <input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} disabled={actLoading} />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input type="text" placeholder="Brief description" value={actDesc} onChange={(e) => setActDesc(e.target.value)} disabled={actLoading} />
              </div>
              <div className="form-group">
                <label>Proof / Certificate <span className="label-hint">(PDF, JPG, PNG — max 5MB)</span></label>
                <input ref={proofRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setActProof(e.target.files[0])} disabled={actLoading} />
                {actProof && <span className="file-chosen">📎 {actProof.name}</span>}
              </div>
              <Alert type={actMsg.type} message={actMsg.text} onClose={() => setActMsg({ type: '', text: '' })} />
              <button type="submit" className="btn-primary" disabled={actLoading}>
                {actLoading ? 'Submitting...' : 'Submit Activity'}
              </button>
            </form>

            {activities?.length > 0 && (
              <div className="activity-history">
                <h4>My Activities</h4>
                <table className="data-table">
                  <thead><tr><th>Title</th><th>Date</th><th>Points</th><th>Status</th></tr></thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={a._id}>
                        <td>{a.title}</td>
                        <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                        <td>{a.points}</td>
                        <td>
                          <span className={`badge ${a.status === 'approved' ? 'badge-green' : a.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                            {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Activity Graph — redesigned */}
          <Card title="📊 Activity Overview">
            {!activityGraph || activityGraph.length === 0
              ? <div className="ag-empty">
                  <span>🎯</span>
                  <p>No activities yet. Submit your first activity above!</p>
                </div>
              : <div className="ag-wrap">
                  <div className="ag-chart">
                    {activityGraph.map((item, i) => {
                      const max = Math.max(...activityGraph.map((x) => x.count), 1)
                      const heightPct = (item.count / max) * 100
                      return (
                        <div key={item.month} className="ag-col">
                          <span className="ag-val">{item.count}</span>
                          <div className="ag-bar-outer">
                            <div
                              className="ag-bar-inner"
                              style={{
                                height: `${heightPct}%`,
                                background: `hsl(${220 + i * 15}, 70%, ${55 - i * 3}%)`,
                              }}
                            />
                          </div>
                          <span className="ag-month">{item.month}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="ag-summary">
                    <div className="ag-stat">
                      <span className="ag-stat-val">{activities.length}</span>
                      <span className="ag-stat-label">Total</span>
                    </div>
                    <div className="ag-stat">
                      <span className="ag-stat-val" style={{ color: 'var(--green)' }}>
                        {activities.filter((a) => a.status === 'approved').length}
                      </span>
                      <span className="ag-stat-label">Approved</span>
                    </div>
                    <div className="ag-stat">
                      <span className="ag-stat-val" style={{ color: 'var(--yellow)' }}>
                        {activities.filter((a) => a.status === 'pending').length}
                      </span>
                      <span className="ag-stat-label">Pending</span>
                    </div>
                    <div className="ag-stat">
                      <span className="ag-stat-val" style={{ color: 'var(--red)' }}>
                        {activities.filter((a) => a.status === 'rejected').length}
                      </span>
                      <span className="ag-stat-label">Rejected</span>
                    </div>
                  </div>
                </div>
            }
          </Card>

          {/* Attendance History */}
          <Card title="Attendance History">
            {attendanceHistory.length === 0
              ? <p className="empty-msg">No attendance records yet.</p>
              : <table className="data-table">
                  <thead><tr><th>Date</th><th>Subject</th><th>Period</th><th>Status</th></tr></thead>
                  <tbody>
                    {attendanceHistory.map((row, i) => (
                      <tr key={i}>
                        <td>{row.date}</td>
                        <td>{row.subject}</td>
                        <td>{row.period}</td>
                        <td><span className={`badge ${row.status === 'Present' ? 'badge-green' : 'badge-red'}`}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Card>

        </div>
      </main>
    </div>
  )
}
