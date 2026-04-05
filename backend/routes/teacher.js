const router = require('express').Router()
const { protect, requireRole } = require('../middleware/auth')
const Attendance = require('../models/Attendance')
const Class = require('../models/Class')

// GET /api/teacher/dashboard
router.get('/dashboard', protect, requireRole('teacher'), async (req, res) => {
  try {
    // Only count students in this teacher's classes
    const classes = await Class.find({ teacher: req.user._id })
    const studentIds = [...new Set(classes.flatMap((c) => c.students.map((s) => s.toString())))]

    const totalStudents = studentIds.length
    const totalClasses = classes.length

    // Avg attendance across teacher's classes only
    let totalPresent = 0, totalRecords = 0
    for (const sid of studentIds) {
      const classIds = classes.map((c) => c._id)
      const records = await Attendance.find({ student: sid, class: { $in: classIds } })
      totalPresent += records.filter((r) => r.status === 'present').length
      totalRecords += records.length
    }
    const avgAttendance = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0

    // At risk — students with < 75% across teacher's classes
    let atRisk = 0
    for (const sid of studentIds) {
      const classIds = classes.map((c) => c._id)
      const records = await Attendance.find({ student: sid, class: { $in: classIds } })
      const pres = records.filter((r) => r.status === 'present').length
      const pct = records.length ? Math.round((pres / records.length) * 100) : 0
      if (pct < 75) atRisk++
    }

    res.json({
      stats: { totalStudents, totalClasses, avgAttendance, atRisk },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
