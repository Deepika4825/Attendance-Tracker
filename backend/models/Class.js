const mongoose = require('mongoose')

const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    teacherType: {
      type: String,
      enum: ['class_teacher', 'subject_teacher'],
      default: 'subject_teacher',
    },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Class', classSchema)
