const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })

// Detect role from email pattern
const detectRole = (email) => {
  const local = email.split('@')[0]
  if (/^\d{2}/.test(local)) return 'student'
  if (/^[a-zA-Z]/.test(local)) return 'teacher'
  return null
}

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, rollNo, department } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' })

    const role = detectRole(email)
    if (!role) return res.status(400).json({ message: 'Invalid email format' })

    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ message: 'Email already registered' })

    const user = await User.create({ name, email, password, role, rollNo, department })
    const token = signToken(user._id)

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user._id)
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/forgot-password  — verify identity by name + rollNo, then reset password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, rollNo, newPassword } = req.body
    if (!email || !rollNo || !newPassword)
      return res.status(400).json({ message: 'Email, roll number and new password are required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: 'No account found with this email' })

    const storedRoll = (user.rollNo || '').toLowerCase().trim()
    const inputRoll = rollNo.toLowerCase().trim()
    if (storedRoll !== inputRoll)
      return res.status(401).json({ message: 'Roll number does not match our records' })

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })

    user.password = newPassword
    await user.save()

    res.json({ message: 'Password reset successful. You can now login.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
