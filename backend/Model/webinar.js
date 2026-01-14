const mongoose = require('mongoose');

const webinarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },

    // Type: webinar (batch) or one_on_one
    type: {
      type: String,
      enum: ['webinar', 'one_on_one'],
      default: 'webinar',
      required: true,
    },

    // For webinar: batch reference
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },

    // For 1:1: student reference
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Teacher/Admin who created the session
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    scheduledTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 60, // minutes
      min: 15,
      max: 240,
    },

    // Meeting fields (generic - can be Google Meet, Zoho, etc.)
    meetingProvider: {
      type: String,
      enum: ['google_meet', 'zoho_meeting'],
      default: 'google_meet',
    },
    meetingId: {
      type: String,
      index: true,
    },
    meetingLink: {
      type: String,
    },
    meetingPassword: {
      type: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    // Participants (for webinar)
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        email: {
          type: String,
        },
        joined: {
          type: Boolean,
          default: false,
        },
        joinTime: {
          type: Date,
        },
        leaveTime: {
          type: Date,
        },
      },
    ],

    // Recording info
    recordingLink: {
      type: String,
    },
    recordingAvailable: {
      type: Boolean,
      default: false,
    },

    // For recurring sessions
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    recurrenceEndDate: {
      type: Date,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
webinarSchema.index({ scheduledTime: 1 });
webinarSchema.index({ teacherId: 1, scheduledTime: 1 });
webinarSchema.index({ studentId: 1, scheduledTime: 1 });
webinarSchema.index({ batch: 1, scheduledTime: 1 });
webinarSchema.index({ status: 1, scheduledTime: 1 });

// Update timestamp before saving
webinarSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Webinar', webinarSchema);
