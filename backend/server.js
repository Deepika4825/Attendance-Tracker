require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const authRoutes = require('./routes/auth')
const studentRoutes = require('./routes/student')
const teacherRoutes = require('./routes/teacher')
const activityRoutes = require('./routes/activity')
const attendanceRoutes = require('./routes/attendance')
const classRoutes = require('./routes/class')

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api', authRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api', attendanceRoutes)
app.use('/api/class', classRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Connect DB then start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(process.env.PORT, '0.0.0.0', () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    )
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })
