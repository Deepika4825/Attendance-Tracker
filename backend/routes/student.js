const router = require('express').Router()
const { protect, requireRole } = require('../middleware/auth')
const Attendance = require('../models/Attendance')
const Activity = require('../models/Activity')

// GET /api/student/dashboard
router.get('/dashboard', protect, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user._id
    const records = await Attendance.find({ student: studentId }).sort({ date: -1 })

    // Subject-wise summary
    const subjectMap = {}
    records.forEach((r) => {
      const key = r.subject || 'Unknown'
      if (!subjectMap[key]) subjectMap[key] = { attended: 0, total: 0 }
      subjectMap[key].total++
      if (r.status === 'present') subjectMap[key].attended++
    })

    const subjectSummary = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      attended: data.attended,
      total: data.total,
      percent: data.total ? Math.round((data.attended / data.total) * 100) : 0,
    }))

    const totalClasses = records.length
    const attended = records.filter((r) => r.status === 'present').length
    const missed = totalClasses - attended
    const overallPercent = totalClasses ? Math.round((attended / totalClasses) * 100) : 0

    const activities = await Activity.find({ student: studentId }).sort({ createdAt: -1 })

    // Activity graph data — count by month
    const activityGraph = {}
    activities.forEach((a) => {
      const month = new Date(a.date).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
      activityGraph[month] = (activityGraph[month] || 0) + 1
    })
    const graphData = Object.entries(activityGraph).map(([month, count]) => ({ month, count }))

    res.json({
      stats: { totalClasses, attended, missed, overallPercent },
      subjectSummary,
      attendanceHistory: records.slice(0, 20).map((r) => ({
        date: r.date.toISOString().split('T')[0],
        subject: r.subject || '—',
        period: r.period || '-',
        status: r.status === 'present' ? 'Present' : 'Absent',
      })),
      activities,
      activityGraph: graphData,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
