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
    type: {
      type: String,
      enum: ['webinar', 'one_on_one'],
      default: 'webinar',
      required: true,
    },
    batch: {
      type: String,
      trim: true,
      index: true,
      default: null,
      set: function (value) {
        // Ensure consistency: always store as string
        if (!value) return null;
        if (mongoose.Types.ObjectId.isValid(value)) {
          console.warn(
            `⚠️ Webinar batch set with ObjectId: ${value}. Converting to string.`
          );
          return value.toString();
        }
        return value.toString().trim();
      },
    },
    batchName: {
      type: String,
      trim: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      index: true,
      sparse: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
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
      default: 60,
      min: 15,
      max: 240,
    },
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
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        name: {
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
        userBatch: {
          type: String,
          trim: true,
        },
        userBatchReference: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
        },
      },
    ],
    recordingLink: {
      type: String,
    },
    recordingAvailable: {
      type: Boolean,
      default: false,
    },
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
    metadata: {
      createdVia: String,
      batchSource: String,
      batchInputType: String,
      originalBatchInput: String,
      participantCount: Number,
      googleMeetCreated: Boolean,
      invitationsSent: Boolean,
    },
    analytics: {
      totalInvited: { type: Number, default: 0 },
      totalJoined: { type: Number, default: 0 },
      averageAttendanceTime: { type: Number, default: 0 },
      peakConcurrent: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
webinarSchema.index({ scheduledTime: 1 });
webinarSchema.index({ teacherId: 1, scheduledTime: 1 });
webinarSchema.index({ studentId: 1, scheduledTime: 1 });
webinarSchema.index({ batch: 1, scheduledTime: 1 });
webinarSchema.index({ batchName: 1, scheduledTime: 1 });
webinarSchema.index({ batchId: 1, scheduledTime: 1 });
webinarSchema.index({ status: 1, scheduledTime: 1 });
webinarSchema.index({ type: 1, status: 1, scheduledTime: 1 });
webinarSchema.index({ 'participants.userId': 1, scheduledTime: 1 });
webinarSchema.index({ meetingProvider: 1, status: 1 });

// Pre-save middleware to ensure data consistency
webinarSchema.pre('save', function (next) {
  // Ensure batch fields are synchronized
  if (this.batch && !this.batchName) {
    this.batchName = this.batch;
  }
  if (this.batchName && !this.batch) {
    this.batch = this.batchName;
  }

  // Update metadata if not set
  if (!this.metadata) {
    this.metadata = {};
  }

  if (!this.metadata.createdVia) {
    this.metadata.createdVia =
      this.type === 'webinar' ? 'batch_schedule' : 'one_on_one';
  }

  if (!this.metadata.participantCount) {
    this.metadata.participantCount = this.participants.length;
  }

  this.updatedAt = Date.now();
  next();
});

// Virtual property for easy access
webinarSchema.virtual('batchInfo').get(function () {
  return {
    name: this.batch,
    displayName: this.batchName || this.batch,
    reference: this.batchId,
    hasReference: !!this.batchId,
  };
});

// Method to check if user can access this webinar
webinarSchema.methods.canUserAccess = function (userId, userBatch) {
  // Teacher can always access
  if (this.teacherId.toString() === userId.toString()) {
    return true;
  }

  // For one-on-one sessions
  if (this.type === 'one_on_one') {
    return (
      this.studentId.toString() === userId.toString() ||
      this.participants.some((p) => p.userId.toString() === userId.toString())
    );
  }

  // For batch webinars
  if (this.type === 'webinar') {
    // Check if user is in participants
    const isParticipant = this.participants.some(
      (p) => p.userId.toString() === userId.toString()
    );
    if (isParticipant) return true;

    // Check batch match
    if (userBatch && this.batch && this.batch === userBatch) {
      return true;
    }
    if (userBatch && this.batchName && this.batchName === userBatch) {
      return true;
    }
  }

  return false;
};

// Method to add participant with batch info
webinarSchema.methods.addParticipant = async function (
  userId,
  email,
  name,
  userBatch,
  userBatchReference
) {
  const existingParticipant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  if (existingParticipant) {
    return existingParticipant;
  }

  const participant = {
    userId,
    email,
    name: name || email.split('@')[0],
    joined: false,
    userBatch: userBatch || null,
    userBatchReference: userBatchReference || null,
  };

  this.participants.push(participant);
  this.metadata.participantCount = this.participants.length;

  return participant;
};

module.exports = mongoose.model('Webinar', webinarSchema);
