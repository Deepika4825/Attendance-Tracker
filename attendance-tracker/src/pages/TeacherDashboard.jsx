import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'
import ClassManager from '../components/ClassManager'
import './StudentDashboard.css'
import './TeacherDashboard.css'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [activities, setActivities] = useState([])
  const [actLoading, setActLoading] = useState(false)
  const [evalPoints, setEvalPoints] = useState({})
  const [evalMsg, setEvalMsg] = useState({ type: '', text: '' })
  const [loadingAct, setLoadingAct] = useState(true)

  const fetchActivities = async () => {
    setLoadingAct(true)
    try {
      const { data: res } = await api.get('/activity')
      setActivities(res)
      const pts = {}
      res.forEach((a) => { pts[a._id] = a.points || 0 })
      setEvalPoints(pts)
    } catch { } finally { setLoadingAct(false) }
  }

  const checkClassTeacher = async () => {
    try {
      const { data } = await api.get('/class/teacher')
      setIsClassTeacher(data.some((c) => c.teacherType === 'class_teacher'))
    } catch { }
  }

  useEffect(() => {
    checkClassTeacher()
    fetchActivities()
  }, [])

  const handleEvaluate = async (activityId, status) => {
    setActLoading(true); setEvalMsg({ type: '', text: '' })
    try {
      await api.post('/activity/evaluate', {
        activityId,
        points: Number(evalPoints[activityId] || 0),
        status,
      })
      setEvalMsg({ type: 'success', text: `Activity ${status} successfully.` })
      fetchActivities()
    } catch (err) {
      setEvalMsg({ type: 'error', text: err.response?.data?.message || 'Evaluation failed.' })
    } finally { setActLoading(false) }
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <main className="dashboard-main">

        <div className="welcome-banner teacher-banner">
          <div>
            <h2>Welcome, {user?.name || user?.email} 👨‍🏫</h2>
            <p>Select a class below to view attendance, generate QR and track students.</p>
          </div>
          <div className="welcome-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="dashboard-grid">

          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="📚 My Classes">
              <ClassManager onClassTeacherChange={setIsClassTeacher} />
            </Card>
          </div>

          {/* Activity Evaluation — only for class teachers */}
          {isClassTeacher && (
            <Card title="Activity Evaluation">
              {loadingAct ? <Spinner text="Loading..." /> : (
                <>
                  <Alert type={evalMsg.type} message={evalMsg.text} onClose={() => setEvalMsg({ type: '', text: '' })} />
                  {activities.length === 0
                    ? <p className="empty-msg">No pending activities.</p>
                    : <table className="data-table">
                        <thead>
                          <tr><th>Student</th><th>Activity</th><th>Date</th><th>Proof</th><th>Points</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                          {activities.map((a) => (
                            <tr key={a._id}>
                              <td>{a.student?.name || a.student?.email || '—'}</td>
                              <td>
                                <div>{a.title}</div>
                                {a.description && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.description}</div>}
                              </td>
                              <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                              <td>
                                {a.proofFileName
                                  ? <a href={`/api/activity/${a._id}/proof`} target="_blank" rel="noreferrer" className="proof-link">
                                      📎 {a.proofFileName}
                                    </a>
                                  : <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>No file</span>
                                }
                              </td>
                              <td>
                                <input type="number" min="0" max="20" className="points-input"
                                  value={evalPoints[a._id] ?? 0}
                                  onChange={(e) => setEvalPoints((p) => ({ ...p, [a._id]: e.target.value }))}
                                  disabled={actLoading} />
                              </td>
                              <td className="eval-actions">
                                <button className="btn-sm btn-approve" onClick={() => handleEvaluate(a._id, 'approved')} disabled={actLoading}>Approve</button>
                                <button className="btn-sm btn-reject" onClick={() => handleEvaluate(a._id, 'rejected')} disabled={actLoading}>Reject</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </>
              )}
            </Card>
          )}

        </div>
      </main>
    </div>
  )
}
