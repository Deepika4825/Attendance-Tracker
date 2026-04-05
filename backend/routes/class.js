const router = require('express').Router()
const multer = require('multer')
const { parse } = require('csv-parse/sync')
const { protect, requireRole } = require('../middleware/auth')
const Class = require('../models/Class')
const User = require('../models/User')
const Attendance = require('../models/Attendance')

const upload = multer({ storage: multer.memoryStorage() })

// POST /api/class/create
router.post('/create', protect, requireRole('teacher'), async (req, res) => {
  try {
    const { className, subjectName, description, teacherType } = req.body
    if (!className || !subjectName)
      return res.status(400).json({ message: 'Class name and subject name are required' })

    const cls = await Class.create({
      className,
      subjectName,
      description,
      teacherType: teacherType || 'subject_teacher',
      teacher: req.user._id,
    })
    res.status(201).json(cls)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/class/teacher
router.get('/teacher', protect, requireRole('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user._id }).sort({ createdAt: -1 })
    res.json(classes)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/class/upload-students
router.post('/upload-students', protect, requireRole('teacher'), upload.single('file'), async (req, res) => {
  try {
    const { classId } = req.body
    if (!classId) return res.status(400).json({ message: 'classId is required' })
    if (!req.file) return res.status(400).json({ message: 'CSV file is required' })

    const cls = await Class.findOne({ _id: classId, teacher: req.user._id })
    if (!cls) return res.status(404).json({ message: 'Class not found' })

    const records = parse(req.file.buffer.toString(), {
      columns: true, skip_empty_lines: true, trim: true,
    })

    const results = { created: 0, existing: 0, errors: [] }

    for (const row of records) {
      const email = (row.email || row.Email || '').toLowerCase().trim()
      const name = (row.studentName || row.name || row.Name || '').trim()
      const registerNumber = (row.registerNumber || row.rollNo || row.RegisterNumber || '').trim()

      if (!email || !name) { results.errors.push('Skipped row — missing name or email'); continue }

      try {
        let student = await User.findOne({ email })
        if (!student) {
          student = await User.create({
            name, email,
            password: registerNumber || 'student123',
            role: 'student',
            rollNo: registerNumber,
          })
          results.created++
        } else {
          results.existing++
        }
        if (!cls.students.includes(student._id)) cls.students.push(student._id)
      } catch (e) {
        results.errors.push(`${email}: ${e.message}`)
      }
    }

    await cls.save()
    res.json({ message: 'Students uploaded successfully', ...results, total: records.length })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/class/:classId/students
router.get('/:classId/students', protect, requireRole('teacher'), async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.classId, teacher: req.user._id })
      .populate('students', 'name email rollNo')
    if (!cls) return res.status(404).json({ message: 'Class not found' })

    const studentList = await Promise.all(
      cls.students.map(async (s) => {
        const records = await Attendance.find({ student: s._id, class: cls._id })
        const present = records.filter((r) => r.status === 'present').length
        const total = records.length
        const percent = total ? Math.round((present / total) * 100) : 0
        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          rollNo: s.rollNo || s.email.split('@')[0],
          present, total, percent,
          status: percent >= 75 ? 'Good' : percent >= 60 ? 'Warning' : 'Danger',
        }
      })
    )

    res.json({ class: cls, studentList })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/class/:classId/attendance-today
router.get('/:classId/attendance-today', protect, requireRole('teacher'), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

    const records = await Attendance.find({
      class: req.params.classId,
      date: { $gte: today, $lt: tomorrow },
      status: 'present',
    }).populate('student', '_id')

    res.json(records.map((r) => r.student._id.toString()))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/class/:classId/top-performers  (only meaningful for class_teacher)
router.get('/:classId/top-performers', protect, requireRole('teacher'), async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.classId, teacher: req.user._id })
      .populate('students', 'name email rollNo')
    if (!cls) return res.status(404).json({ message: 'Class not found' })

    // Only return top performers for class teachers
    if (cls.teacherType !== 'class_teacher') return res.json([])

    const performers = await Promise.all(
      cls.students.map(async (s) => {
        const records = await Attendance.find({ student: s._id, class: cls._id })
        const present = records.filter((r) => r.status === 'present').length
        const pct = records.length ? Math.round((present / records.length) * 100) : 0
        return { _id: s._id, name: s.name, rollNo: s.rollNo || s.email.split('@')[0], percent: pct }
      })
    )
    performers.sort((a, b) => b.percent - a.percent)
    res.json(performers.slice(0, 5).map((p, i) => ({ rank: i + 1, ...p })))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/class/:classId/stats  — per-class stats shown when class is selected
router.get('/:classId/stats', protect, requireRole('teacher'), async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.classId, teacher: req.user._id })
    if (!cls) return res.status(404).json({ message: 'Class not found' })

    const classIds = [cls._id]
    let totalPresent = 0, totalRecords = 0, atRisk = 0

    for (const sid of cls.students) {
      const records = await Attendance.find({ student: sid, class: { $in: classIds } })
      const pres = records.filter((r) => r.status === 'present').length
      const pct = records.length ? Math.round((pres / records.length) * 100) : 0
      totalPresent += pres
      totalRecords += records.length
      if (pct < 75 && records.length > 0) atRisk++
    }

    res.json({
      totalStudents: cls.students.length,
      avgAttendance: totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0,
      atRisk,
      teacherType: cls.teacherType,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
