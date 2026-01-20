const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // BASIC USER DATA
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // AUTH FIELDS
    passwordHash: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    // PAYMENT FIELDS
    isPaidUser: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    lastPaymentDate: {
      type: Date,
    },
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],

    // BATCH MANAGEMENT - UPDATED FOR WEBINAR SYSTEM
    batch: {
      type: String,
      trim: true,
      index: true,
      default: null,
      set: function (value) {
        // Ensure batch is always stored as string for consistency
        if (!value) return null;
        if (mongoose.Types.ObjectId.isValid(value)) {
          console.warn(
            `⚠️ User batch set with ObjectId: ${value}. Converting to string.`
          );
          return value.toString();
        }
        return value.toString().trim();
      },
    },
    batchReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      index: true,
      sparse: true,
    },

    // PROFILE IMAGE
    picture: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: '',
    },

    // ROLE
    role: {
      type: String,
      enum: ['user', 'admin', 'owner', 'teacher', 'developer'],
      default: 'user',
    },

    // TUTORING SYSTEM
    tutoring: {
      purchased: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ['none', 'pending', 'active', 'completed', 'cancelled'],
        default: 'none',
      },
      purchasedAt: {
        type: Date,
      },
      activatedAt: {
        type: Date,
      },
      activatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      mentorAvailabilityNotified: {
        type: Boolean,
        default: false,
      },
      lastNotifiedAt: {
        type: Date,
      },
      completedAt: {
        type: Date,
      },
      sessionCount: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
      subscription: {
        type: {
          type: String,
          enum: ['basic', 'premium', 'enterprise'],
          default: 'basic',
        },
        sessionsIncluded: {
          type: Number,
          default: 4,
        },
        remainingSessions: {
          type: Number,
          default: 4,
        },
        expiryDate: {
          type: Date,
        },
      },
    },
    tutoringOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],

    // GOOGLE OAUTH & CALENDAR INTEGRATION
    googleId: {
      type: String,
      index: true,
      sparse: true,
    },
    googleRefreshToken: {
      type: String,
      select: false,
    },
    googleAccessToken: {
      type: String,
      select: false,
    },
    googleTokenExpiry: {
      type: Date,
      select: false,
    },
    googleCalendarConnected: {
      type: Boolean,
      default: false,
    },
    googleCalendarId: {
      type: String,
      default: null,
    },

    // PROFILE SETUP FIELDS
    fullName: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'India',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },

    // PROFILE STATUS
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // ADDITIONAL PROFILE INFO
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    education: {
      type: String,
      default: '',
    },
    occupation: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    languages: [
      {
        type: String,
      },
    ],
    interests: [
      {
        type: String,
      },
    ],

    // PURCHASE HISTORY
    orders: {
      type: [
        {
          orderId: String,
          amount: Number,
          currency: String,
          status: String,
          createdAt: Date,
          paymentId: String,
          productType: {
            type: String,
            enum: ['course', 'tutoring', 'webinar', 'subscription'],
          },
          productId: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: [],
    },

    // TESTIMONIALS
    testimonials: {
      type: Array,
      default: [],
    },

    // COURSE PROGRESS
    coursesProgress: {
      type: [
        {
          courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Courses',
          },
          courseName: String,
          percentComplete: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          lastAccessed: {
            type: Date,
            default: Date.now,
          },
          topics: [
            {
              topicId: {
                type: mongoose.Schema.Types.ObjectId,
              },
              topicName: String,
              percent: {
                type: Number,
                default: 0,
              },
              lastSeenAt: {
                type: Date,
              },
              lastImageIndex: {
                type: Number,
                default: 0,
              },
              completed: {
                type: Boolean,
                default: false,
              },
            },
          ],
          startedAt: {
            type: Date,
            default: Date.now,
          },
          completedAt: {
            type: Date,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // NOTES
    notes: {
      type: [
        {
          courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Courses',
          },
          courseName: String,
          topicId: {
            type: mongoose.Schema.Types.ObjectId,
          },
          topicName: String,
          imageIndex: {
            type: Number,
          },
          note: {
            type: String,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
          tags: [String],
        },
      ],
      default: [],
    },

    // WEBINAR & SESSION STATISTICS
    webinarStats: {
      totalInvited: {
        type: Number,
        default: 0,
      },
      totalAttended: {
        type: Number,
        default: 0,
      },
      attendanceRate: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
      lastWebinarAttended: {
        type: Date,
      },
      streak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
        lastUpdated: {
          type: Date,
        },
      },
    },

    // NOTIFICATION SETTINGS
    notifications: {
      email: {
        webinarReminders: {
          type: Boolean,
          default: true,
        },
        courseUpdates: {
          type: Boolean,
          default: true,
        },
        tutoringSessions: {
          type: Boolean,
          default: true,
        },
        announcements: {
          type: Boolean,
          default: true,
        },
      },
      push: {
        enabled: {
          type: Boolean,
          default: true,
        },
        webinarReminders: {
          type: Boolean,
          default: true,
        },
        sessionStarting: {
          type: Boolean,
          default: true,
        },
      },
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
    },

    // PRIVACY SETTINGS
    privacy: {
      profileVisible: {
        type: Boolean,
        default: true,
      },
      showProgress: {
        type: Boolean,
        default: true,
      },
      showCourses: {
        type: Boolean,
        default: true,
      },
      showWebinars: {
        type: Boolean,
        default: true,
      },
    },

    // ACCOUNT STATUS
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    loginCount: {
      type: Number,
      default: 0,
    },

    // METADATA
    metadata: {
      signupSource: {
        type: String,
        enum: ['direct', 'google', 'referral', 'marketing'],
        default: 'direct',
      },
      referrer: String,
      ipAddress: String,
      userAgent: String,
      deviceInfo: mongoose.Schema.Types.Mixed,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmTerm: String,
      utmContent: String,
    },

    // TEACHER SPECIFIC FIELDS (if role is teacher)
    teacherProfile: {
      bio: String,
      qualifications: [String],
      expertise: [String],
      experience: {
        years: Number,
        description: String,
      },
      rating: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
      availability: {
        schedule: mongoose.Schema.Types.Mixed,
        timezone: {
          type: String,
          default: 'Asia/Kolkata',
        },
      },
      webinarsHosted: {
        type: Number,
        default: 0,
      },
      studentsTaught: {
        type: Number,
        default: 0,
      },
      hourlyRate: {
        type: Number,
      },
    },

    // SOCIAL CONNECTIONS
    connections: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'blocked'],
          default: 'pending',
        },
        connectedAt: Date,
      },
    ],

    // ACHIEVEMENTS & BADGES
    achievements: [
      {
        badgeId: String,
        name: String,
        description: String,
        earnedAt: Date,
        icon: String,
      },
    ],

    // BOOKMARKS
    bookmarks: {
      courses: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Courses',
        },
      ],
      webinars: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Webinar',
        },
      ],
      notes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Note',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// ========== MIDDLEWARE ==========

// IMPORTANT: REMOVED password hashing from here
// Password is already hashed in auth.js routes
UserSchema.pre('save', async function (next) {
  // NO password hashing here - it's already done in auth.js

  // Ensure batch consistency
  if (this.isModified('batch') && this.batch) {
    if (mongoose.Types.ObjectId.isValid(this.batch)) {
      console.warn(
        `⚠️ User ${this.email}: batch field should be string, not ObjectId`
      );
    }
  }

  // Update timestamps
  if (this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();

  next();
});

// ========== INSTANCE METHODS ==========

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Check if user can access webinar
UserSchema.methods.canAccessWebinar = function (webinar) {
  // Admin/owner/teacher can access all
  if (['admin', 'owner', 'teacher'].includes(this.role)) {
    return true;
  }

  // Check 1:1 sessions
  if (webinar.type === 'one_on_one') {
    return (
      webinar.studentId && webinar.studentId.toString() === this._id.toString()
    );
  }

  // Check batch webinars
  if (webinar.type === 'webinar') {
    // Check if in participants
    const isParticipant = webinar.participants?.some(
      (p) => p.userId && p.userId.toString() === this._id.toString()
    );
    if (isParticipant) return true;

    // Check batch match
    if (this.batch && webinar.batch && this.batch === webinar.batch) {
      return true;
    }
    if (this.batch && webinar.batchName && this.batch === webinar.batchName) {
      return true;
    }
    if (
      this.batchReference &&
      webinar.batchId &&
      this.batchReference.toString() === webinar.batchId.toString()
    ) {
      return true;
    }
  }

  return false;
};

// Check if user has tutoring access
UserSchema.methods.hasTutoringAccess = function () {
  return (
    this.tutoring.purchased &&
    this.tutoring.status === 'active' &&
    (!this.tutoring.subscription.expiryDate ||
      new Date(this.tutoring.subscription.expiryDate) > new Date())
  );
};

// Get user's batch info
UserSchema.methods.getBatchInfo = function () {
  return {
    name: this.batch,
    reference: this.batchReference,
    hasReference: !!this.batchReference,
  };
};

// Update webinar stats
UserSchema.methods.updateWebinarStats = function (
  attended = true,
  duration = 0
) {
  if (attended) {
    this.webinarStats.totalAttended += 1;
    this.webinarStats.totalHours += duration;
    this.webinarStats.lastWebinarAttended = new Date();

    // Update streak
    const today = new Date();
    const lastUpdated = this.webinarStats.streak.lastUpdated;

    if (
      !lastUpdated ||
      today.getDate() !== lastUpdated.getDate() ||
      today.getMonth() !== lastUpdated.getMonth() ||
      today.getFullYear() !== lastUpdated.getFullYear()
    ) {
      // New day
      this.webinarStats.streak.current += 1;
      if (this.webinarStats.streak.current > this.webinarStats.streak.longest) {
        this.webinarStats.streak.longest = this.webinarStats.streak.current;
      }
      this.webinarStats.streak.lastUpdated = today;
    }
  }

  if (this.webinarStats.totalInvited > 0) {
    this.webinarStats.attendanceRate =
      (this.webinarStats.totalAttended / this.webinarStats.totalInvited) * 100;
  }
};

// ========== STATIC METHODS ==========

// Find users by batch
UserSchema.statics.findByBatch = function (batchIdentifier) {
  const query = {};

  if (mongoose.Types.ObjectId.isValid(batchIdentifier)) {
    // Search by batchReference (ObjectId) OR batch (string)
    query.$or = [
      { batchReference: batchIdentifier },
      { batch: batchIdentifier },
    ];
  } else {
    // Search by batch string
    query.batch = batchIdentifier;
  }

  return this.find(query);
};

// Find active students for batch webinar
UserSchema.statics.findActiveBatchStudents = function (batchName) {
  return this.find({
    batch: batchName,
    isActive: true,
    role: 'user',
  }).select('email name _id batch batchReference');
};

// ========== VIRTUAL PROPERTIES ==========

// Full profile completion percentage
UserSchema.virtual('profileCompletion').get(function () {
  let completed = 0;
  let total = 0;

  // Basic info
  if (this.name) completed += 1;
  total += 1;

  if (this.email) completed += 1;
  total += 1;

  if (this.phone) completed += 1;
  total += 1;

  if (this.city) completed += 1;
  total += 1;

  if (this.bio && this.bio.length > 0) completed += 1;
  total += 1;

  return Math.round((completed / total) * 100);
});

// User display name
UserSchema.virtual('displayName').get(function () {
  return this.fullName || this.name || this.email.split('@')[0];
});

// Is teacher
UserSchema.virtual('isTeacher').get(function () {
  return ['teacher', 'admin', 'owner'].includes(this.role);
});

// Is admin
UserSchema.virtual('isAdmin').get(function () {
  return ['admin', 'owner', 'developer'].includes(this.role);
});

// Has Google Calendar connected
UserSchema.virtual('hasGoogleCalendar').get(function () {
  return this.googleCalendarConnected && this.googleRefreshToken;
});

// ========== INDEXES ==========

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ batch: 1 });
UserSchema.index({ batchReference: 1 });
UserSchema.index({ 'tutoring.status': 1 });
UserSchema.index({ 'tutoring.purchased': 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'coursesProgress.courseId': 1 });
UserSchema.index({ 'coursesProgress.lastAccessed': -1 });
UserSchema.index({ 'webinarStats.totalAttended': -1 });
UserSchema.index({ 'webinarStats.attendanceRate': -1 });

// Compound indexes
UserSchema.index({ batch: 1, isActive: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ 'tutoring.purchased': 1, 'tutoring.status': 1 });
UserSchema.index({ email: 1, isVerified: 1 });

module.exports = mongoose.model('User', UserSchema);
