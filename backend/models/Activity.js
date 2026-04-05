const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    proofFileName: { type: String },   // original filename
    proofFileData: { type: String },   // base64 encoded file
    proofMimeType: { type: String },
    points: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Activity', activitySchema)
