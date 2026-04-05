const router = require('express').Router()
const multer = require('multer')
const { protect, requireRole } = require('../middleware/auth')
const Activity = require('../models/Activity')
const Class = require('../models/Class')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
})

// POST /api/activity/upload  (student) — multipart form with optional proof file
router.post('/upload', protect, requireRole('student'), upload.single('proof'), async (req, res) => {
  try {
    const { title, date, description } = req.body
    if (!title || !date) return res.status(400).json({ message: 'Title and date are required' })

    const actData = {
      student: req.user._id,
      title,
      date: new Date(date),
      description,
    }

    if (req.file) {
      actData.proofFileName = req.file.originalname
      actData.proofFileData = req.file.buffer.toString('base64')
      actData.proofMimeType = req.file.mimetype
    }

    const activity = await Activity.create(actData)
    res.status(201).json(activity)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/activity
// - Teacher: only pending activities from students in their class_teacher classes
// - Student: own activities
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      // Find all class_teacher classes for this teacher
      const classes = await Class.find({
        teacher: req.user._id,
        teacherType: 'class_teacher',
      })

      // Collect all student IDs from those classes
      const studentIds = [...new Set(
        classes.flatMap((c) => c.students.map((s) => s.toString()))
      )]

      const activities = await Activity.find({
        status: 'pending',
        student: { $in: studentIds },
      })
        .populate('student', 'name email rollNo')
        .sort({ createdAt: -1 })
        // Don't send file data in list — too heavy
        .select('-proofFileData')

      res.json(activities)
    } else {
      const activities = await Activity.find({ student: req.user._id })
        .sort({ createdAt: -1 })
        .select('-proofFileData')
      res.json(activities)
    }
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/activity/:id/proof  — download proof file
router.get('/:id/proof', protect, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).select('proofFileData proofMimeType proofFileName student')
    if (!activity || !activity.proofFileData)
      return res.status(404).json({ message: 'No proof file found' })

    // Only the student themselves or a teacher can view
    if (
      req.user.role === 'student' &&
      activity.student.toString() !== req.user._id.toString()
    ) return res.status(403).json({ message: 'Access denied' })

    const buffer = Buffer.from(activity.proofFileData, 'base64')
    res.set('Content-Type', activity.proofMimeType)
    res.set('Content-Disposition', `inline; filename="${activity.proofFileName}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/activity/evaluate  (teacher)
router.post('/evaluate', protect, requireRole('teacher'), async (req, res) => {
  try {
    const { activityId, points, status } = req.body
    if (!activityId || points === undefined || !status)
      return res.status(400).json({ message: 'activityId, points and status are required' })

    const activity = await Activity.findByIdAndUpdate(
      activityId,
      { points, status, evaluatedBy: req.user._id },
      { new: true }
    ).populate('student', 'name email rollNo')

    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    res.json(activity)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
