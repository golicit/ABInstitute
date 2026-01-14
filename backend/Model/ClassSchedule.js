const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  meetingLink: {
    type: String,
    default: '',
  },
  meetingPlatform: {
    type: String,
    enum: ['zoom', 'google_meet', 'teams', 'zoho_meeting', 'other'],
    default: 'zoom',
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled',
  },
  zohoEventId: {
    type: String,
    default: null,
  },
  zapierWebhookId: {
    type: String,
    default: null,
  },
  recurrence: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
classScheduleSchema.index({ startTime: 1 });
classScheduleSchema.index({ teacherId: 1, startTime: 1 });
classScheduleSchema.index({ studentIds: 1, startTime: 1 });
classScheduleSchema.index({ status: 1 });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
