import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api/axios'
import Card from './Card'
import Alert from './Alert'
import Spinner from './Spinner'
import StatCard from './StatCard'
import './ClassManager.css'

export default function ClassManager({ onClassTeacherChange }) {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [todayPresent, setTodayPresent] = useState([])
  const [topPerformers, setTopPerformers] = useState([])
  const [classStats, setClassStats] = useState(null)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [newClass, setNewClass] = useState({
    className: '', subjectName: '', description: '', teacherType: 'subject_teacher',
  })
  const [createMsg, setCreateMsg] = useState({ type: '', text: '' })
  const [creating, setCreating] = useState(false)

  const [csvFile, setCsvFile] = useState(null)
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const [qrData, setQrData] = useState(null)
  const [qrActive, setQrActive] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrTimeLeft, setQrTimeLeft] = useState(null)
  const [qrError, setQrError] = useState('')

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const { data } = await api.get('/class/teacher')
      setClasses(data)
      // Notify parent if this teacher has any class_teacher type class
      if (onClassTeacherChange) {
        onClassTeacherChange(data.some((c) => c.teacherType === 'class_teacher'))
      }
    } catch { } finally { setLoadingClasses(false) }
  }

  const fetchClassData = async (cls) => {
    setLoadingStudents(true)
    setClassStudents([]); setTodayPresent([]); setTopPerformers([]); setClassStats(null)
    try {
      const [studRes, todayRes, topRes, statsRes] = await Promise.all([
        api.get(`/class/${cls._id}/students`),
        api.get(`/class/${cls._id}/attendance-today`),
        api.get(`/class/${cls._id}/top-performers`),
        api.get(`/class/${cls._id}/stats`),
      ])
      setClassStudents(studRes.data.studentList)
      setTodayPresent(todayRes.data)
      setTopPerformers(topRes.data)
      setClassStats(statsRes.data)
    } catch { } finally { setLoadingStudents(false) }
  }

  useEffect(() => { fetchClasses() }, [])

  useEffect(() => {
    if (!qrActive || !selectedClass) return
    const interval = setInterval(() => generateQR(), 45000)
    return () => clearInterval(interval)
  }, [qrActive, selectedClass])

  useEffect(() => {
    if (qrTimeLeft === null || qrTimeLeft <= 0) return
    const t = setTimeout(() => setQrTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [qrTimeLeft])

  const handleSelectClass = (cls) => {
    setSelectedClass(cls)
    fetchClassData(cls)
    setQrActive(false); setQrData(null); setQrTimeLeft(null)
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    if (!newClass.className || !newClass.subjectName) {
      setCreateMsg({ type: 'error', text: 'Class name and subject are required.' }); return
    }
    setCreating(true); setCreateMsg({ type: '', text: '' })
    try {
      await api.post('/class/create', newClass)
      setCreateMsg({ type: 'success', text: 'Class created!' })
      setNewClass({ className: '', subjectName: '', description: '', teacherType: 'subject_teacher' })
      setShowCreate(false)
      fetchClasses()
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create class.' })
    } finally { setCreating(false) }
  }

  const handleUploadCSV = async (e) => {
    e.preventDefault()
    if (!csvFile || !selectedClass) {
      setUploadMsg({ type: 'error', text: 'Select a class and a CSV file.' }); return
    }
    setUploading(true); setUploadMsg({ type: '', text: '' })
    const form = new FormData()
    form.append('file', csvFile)
    form.append('classId', selectedClass._id)
    try {
      const { data } = await api.post('/class/upload-students', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadMsg({ type: 'success', text: `Done! ${data.created} new, ${data.existing} existing students added.` })
      setCsvFile(null)
      if (fileRef.current) fileRef.current.value = ''
      fetchClassData(selectedClass)
    } catch (err) {
      setUploadMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' })
    } finally { setUploading(false) }
  }

  const generateQR = async () => {
    if (!selectedClass) return
    setQrLoading(true); setQrError('')
    try {
      const { data } = await api.post('/generate-qr', {
        subject: selectedClass.subjectName,
        classId: selectedClass._id,
      })
      setQrData(data)
      setQrTimeLeft(data.expirySeconds || 45)
    } catch (err) {
      setQrError(err.response?.data?.message || 'Failed to generate QR.')
    } finally { setQrLoading(false) }
  }

  const handleStartQR = () => { setQrActive(true); generateQR() }
  const handleStopQR = () => { setQrActive(false); setQrData(null); setQrTimeLeft(null) }

  const isClassTeacher = selectedClass?.teacherType === 'class_teacher'

  return (
    <div className="cm-wrap">

      {/* Header */}
      <div className="cm-header">
        <h3>My Classes</h3>
        <button className="btn-primary cm-create-btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? '✕ Cancel' : '+ Create Class'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="cm-create-card">
          <form onSubmit={handleCreateClass} className="cm-form">
            <div className="cm-form-row">
              <div className="form-group">
                <label>Class Name</label>
                <input type="text" placeholder="e.g. III AI & DS A"
                  value={newClass.className}
                  onChange={(e) => setNewClass((p) => ({ ...p, className: e.target.value }))}
                  disabled={creating} />
              </div>
              <div className="form-group">
                <label>Subject Name</label>
                <input type="text" placeholder="e.g. Data Structures"
                  value={newClass.subjectName}
                  onChange={(e) => setNewClass((p) => ({ ...p, subjectName: e.target.value }))}
                  disabled={creating} />
              </div>
            </div>

            {/* Teacher type selection */}
            <div className="form-group">
              <label>Your Role for this Class</label>
              <div className="cm-type-options">
                <label className={`cm-type-option ${newClass.teacherType === 'class_teacher' ? 'selected' : ''}`}>
                  <input type="radio" name="teacherType" value="class_teacher"
                    checked={newClass.teacherType === 'class_teacher'}
                    onChange={(e) => setNewClass((p) => ({ ...p, teacherType: e.target.value }))} />
                  <span className="cm-type-icon">🏫</span>
                  <div>
                    <span className="cm-type-title">Class Teacher</span>
                    <span className="cm-type-desc">You are the mentor/class teacher. Top performers will be shown.</span>
                  </div>
                </label>
                <label className={`cm-type-option ${newClass.teacherType === 'subject_teacher' ? 'selected' : ''}`}>
                  <input type="radio" name="teacherType" value="subject_teacher"
                    checked={newClass.teacherType === 'subject_teacher'}
                    onChange={(e) => setNewClass((p) => ({ ...p, teacherType: e.target.value }))} />
                  <span className="cm-type-icon">📖</span>
                  <div>
                    <span className="cm-type-title">Subject Teacher</span>
                    <span className="cm-type-desc">You handle only this subject for the class.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <input type="text" placeholder="Brief description"
                value={newClass.description}
                onChange={(e) => setNewClass((p) => ({ ...p, description: e.target.value }))}
                disabled={creating} />
            </div>

            <Alert type={createMsg.type} message={createMsg.text} onClose={() => setCreateMsg({ type: '', text: '' })} />
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Class'}
            </button>
          </form>
        </Card>
      )}

      {/* Class chips */}
      {loadingClasses ? <Spinner text="Loading classes..." /> : (
        <div className="cm-class-list">
          {classes.length === 0
            ? <p className="empty-msg">No classes yet. Create one above.</p>
            : classes.map((cls) => (
              <div key={cls._id}
                className={`cm-class-chip ${selectedClass?._id === cls._id ? 'active' : ''}`}
                onClick={() => handleSelectClass(cls)}>
                <div className="cm-chip-top">
                  <span className="cm-chip-name">{cls.className}</span>
                  <span className={`cm-chip-type ${cls.teacherType === 'class_teacher' ? 'type-ct' : 'type-st'}`}>
                    {cls.teacherType === 'class_teacher' ? '🏫 Class Teacher' : '📖 Subject'}
                  </span>
                </div>
                <span className="cm-chip-sub">{cls.subjectName}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Selected class detail */}
      {selectedClass && (
        <div className="cm-detail">
          <div className="cm-detail-header">
            <div>
              <span className="cm-detail-title">{selectedClass.className}</span>
              <span className="cm-detail-sub"> — {selectedClass.subjectName}</span>
            </div>
            <span className={`cm-chip-type ${selectedClass.teacherType === 'class_teacher' ? 'type-ct' : 'type-st'}`}>
              {selectedClass.teacherType === 'class_teacher' ? '🏫 Class Teacher' : '📖 Subject Teacher'}
            </span>
          </div>

          {/* Per-class stats — shown only after selecting a class */}
          {classStats && (
            <div className="stats-grid cm-stats">
              <StatCard icon="👥" label="Students" value={classStats.totalStudents} color="blue" />
              <StatCard icon="📊" label="Avg Attendance" value={`${classStats.avgAttendance}%`} color="green" />
              <StatCard icon="⚠️" label="At Risk (<75%)" value={classStats.atRisk} color="red" />
              <StatCard icon="📅" label="Today Present" value={todayPresent.length} color="yellow" />
            </div>
          )}

          <div className="dashboard-grid">

            {/* QR */}
            <Card title={`QR Attendance — ${selectedClass.subjectName}`}>
              <div className="qr-section">
                <div className="qr-btn-row">
                  {!qrActive
                    ? <button className="btn-primary qr-btn" onClick={handleStartQR} disabled={qrLoading}>
                        {qrLoading ? 'Generating...' : '🔲 Start QR Session'}
                      </button>
                    : <button className="btn-stop qr-btn" onClick={handleStopQR}>⏹ Stop Session</button>
                  }
                </div>
                <Alert type="error" message={qrError} onClose={() => setQrError('')} />
                {qrData ? (
                  <div className="qr-display">
                    <div className="qr-refresh-badge">
                      {qrLoading ? '🔄 Refreshing...' : `🔄 Auto-refreshes in ${qrTimeLeft}s`}
                    </div>
                    <QRCodeSVG
                      value={`${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/mark-attendance?token=${qrData.token}`}
                      size={200} includeMargin
                    />
                    <p className="qr-info">Class: <strong>{selectedClass.className}</strong></p>
                    <p className="qr-info">Subject: <strong>{qrData.subject}</strong></p>
                    <div className="qr-token-box">
                      <span className="qr-token-label">Token:</span>
                      <code className="qr-token">{qrData.token}</code>
                    </div>
                  </div>
                ) : (
                  !qrActive && (
                    <div className="qr-empty">
                      <span>📷</span>
                      <p>Start a QR session for <strong>{selectedClass.className}</strong></p>
                    </div>
                  )
                )}
              </div>
            </Card>

            {/* Upload CSV */}
            <Card title="Upload Student List (CSV)">
              <div className="cm-csv-info">
                <p>CSV columns: <code>studentName</code>, <code>email</code>, <code>registerNumber</code></p>
                <a href="#" className="cm-sample-link" onClick={(e) => {
                  e.preventDefault()
                  const csv = 'studentName,email,registerNumber\nArun Kumar,23ad001@college.com,23AD001\nPriya S,23ad002@college.com,23AD002'
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob); a.download = 'sample.csv'; a.click()
                }}>⬇ Download sample CSV</a>
              </div>
              <form onSubmit={handleUploadCSV} className="cm-form">
                <div className="form-group">
                  <label>Select CSV File</label>
                  <input ref={fileRef} type="file" accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])} disabled={uploading} />
                </div>
                <Alert type={uploadMsg.type} message={uploadMsg.text} onClose={() => setUploadMsg({ type: '', text: '' })} />
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : '📤 Upload Students'}
                </button>
              </form>
            </Card>

            {/* Student list */}
            <Card title={`Students (${classStudents.length})`} className="cm-students-card">
              {loadingStudents ? <Spinner text="Loading students..." /> :
                classStudents.length === 0
                  ? <p className="empty-msg">No students yet. Upload a CSV to add students.</p>
                  : (
                    <table className="data-table">
                      <thead>
                        <tr><th>Roll No</th><th>Name</th><th>Present</th><th>Total</th><th>%</th><th>Today</th></tr>
                      </thead>
                      <tbody>
                        {classStudents.map((s) => (
                          <tr key={s._id}>
                            <td>{s.rollNo}</td>
                            <td>{s.name}</td>
                            <td>{s.present}</td>
                            <td>{s.total}</td>
                            <td>
                              <span className={`badge ${s.percent >= 75 ? 'badge-green' : s.percent >= 60 ? 'badge-yellow' : 'badge-red'}`}>
                                {s.percent}%
                              </span>
                            </td>
                            <td>
                              {todayPresent.includes(s._id.toString())
                                ? <span className="badge badge-green">✓ Present</span>
                                : <span className="badge badge-red">Absent</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              }
            </Card>

            {/* Attendance Overview */}
            <Card title={`Attendance Overview — ${selectedClass.className}`}>
              {loadingStudents ? <Spinner text="Loading..." /> :
                classStudents.length === 0
                  ? <p className="empty-msg">No students yet.</p>
                  : (
                    <div className="overview-bars">
                      {classStudents.map((s) => (
                        <div key={s._id} className="overview-row">
                          <span className="overview-name">{s.name}</span>
                          <div className="overview-bar-wrap">
                            <div className="overview-bar" style={{
                              width: `${s.percent}%`,
                              background: s.percent >= 75 ? 'var(--green)' : s.percent >= 60 ? 'var(--yellow)' : 'var(--red)',
                            }} />
                          </div>
                          <span className="overview-pct">{s.percent}%</span>
                        </div>
                      ))}
                    </div>
                  )
              }
            </Card>

            {/* Top Performers — CLASS TEACHER ONLY */}
            {isClassTeacher && (
              <Card title={`🏆 Top Performers — ${selectedClass.className}`}>
                {loadingStudents ? <Spinner text="Loading..." /> :
                  topPerformers.length === 0
                    ? <p className="empty-msg">No attendance data yet.</p>
                    : (
                      <table className="data-table">
                        <thead>
                          <tr><th>Rank</th><th>Name</th><th>Roll No</th><th>Attendance</th></tr>
                        </thead>
                        <tbody>
                          {topPerformers.map((p) => (
                            <tr key={p._id}>
                              <td><span className="rank-badge">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}</span></td>
                              <td>{p.name}</td>
                              <td>{p.rollNo}</td>
                              <td><span className="badge badge-green">{p.percent}%</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                }
              </Card>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
