const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const { protect, requireRole } = require('../middleware/auth')
const QRSession = require('../models/QRSession')
const Attendance = require('../models/Attendance')
const Class = require('../models/Class')

// POST /api/generate-qr  (teacher only)
router.post('/generate-qr', protect, requireRole('teacher'), async (req, res) => {
  try {
    const { subject, classId } = req.body
    if (!subject) return res.status(400).json({ message: 'Subject is required' })

    // Validate class belongs to teacher if classId provided
    if (classId) {
      const cls = await Class.findOne({ _id: classId, teacher: req.user._id })
      if (!cls) return res.status(404).json({ message: 'Class not found' })
    }

    const token = uuidv4()
    const expirySeconds = parseInt(process.env.QR_EXPIRY_SECONDS) || 45
    const expiresAt = new Date(Date.now() + expirySeconds * 1000)

    await QRSession.create({
      teacher: req.user._id,
      class: classId || null,
      subject,
      token,
      expiresAt,
    })

    res.json({ token, subject, classId: classId || null, expiresAt, expirySeconds })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/qr-session/:token  (public)
router.get('/qr-session/:token', async (req, res) => {
  try {
    const session = await QRSession.findOne({ token: req.params.token, active: true })
      .populate('class', 'className subjectName')
    if (!session) return res.status(404).json({ message: 'Invalid or expired QR code' })
    if (new Date() > session.expiresAt) {
      session.active = false
      await session.save()
      return res.status(410).json({ message: 'QR code has expired' })
    }
    res.json({
      subject: session.subject,
      expiresAt: session.expiresAt,
      classId: session.class?._id || null,
      className: session.class?.className || null,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/mark-attendance  (student only)
router.post('/mark-attendance', protect, requireRole('student'), async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ message: 'QR token is required' })

    const session = await QRSession.findOne({ token, active: true })
    if (!session) return res.status(404).json({ message: 'Invalid QR code' })

    if (new Date() > session.expiresAt) {
      session.active = false
      await session.save()
      return res.status(410).json({ message: 'QR code has expired' })
    }

    if (session.markedBy.includes(req.user._id)) {
      return res.status(409).json({ message: 'Attendance already marked for this session' })
    }

    // If class-linked QR, verify student belongs to that class
    if (session.class) {
      const cls = await Class.findById(session.class)
      if (cls && !cls.students.includes(req.user._id)) {
        return res.status(403).json({ message: 'You are not enrolled in this class' })
      }
    }

    await Attendance.create({
      student: req.user._id,
      class: session.class || null,
      subject: session.subject,
      date: new Date(),
      status: 'present',
      markedViaQR: true,
      qrToken: token,
    })

    session.markedBy.push(req.user._id)
    await session.save()

    res.json({
      message: `Attendance marked for ${session.subject}`,
      subject: session.subject,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
