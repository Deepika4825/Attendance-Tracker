const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: String },
    date: { type: Date, default: Date.now },
    period: { type: String },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    markedViaQR: { type: Boolean, default: false },
    qrToken: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Attendance', attendanceSchema)
