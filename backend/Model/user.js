const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // BASIC USER DATA
  name: { type: String },
  email: { type: String, required: true, unique: true },

  // AUTH FIELDS
  passwordHash: { type: String, default: null },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },

  // PAYMENT FIELDS
  isPaidUser: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
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

  // GOOGLE PROFILE PICTURE
  picture: { type: String, default: null },

  // ROLE
  role: {
    type: String,
    enum: ['user', 'admin', 'owner', 'developer'],
    default: 'user',
  },

  // PROFILE SETUP FIELDS
  fullName: { type: String, default: '' },
  phone: { type: String, default: '' },
  gender: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  profileImage: { type: String, default: '' },

  // MARK IF PROFILE IS COMPLETED
  profileCompleted: { type: Boolean, default: false },

  // PURCHASE HISTORY (used for access control)
  orders: {
    type: [
      {
        orderId: String,
        amount: Number,
        currency: String,
        status: String,
        createdAt: Date,
        paymentId: String,
      },
    ],
    default: [],
  },
  testimonials: { type: Array, default: [] },

  // COURSE PROGRESS
  coursesProgress: {
    type: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Courses' },
        topics: [
          {
            topicId: { type: mongoose.Schema.Types.ObjectId },
            percent: { type: Number, default: 0 },
            lastSeenAt: { type: Date },
            lastImageIndex: { type: Number, default: 0 },
          },
        ],
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  // NOTES TAKEN BY USER
  notes: {
    type: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Courses' },
        topicId: { type: mongoose.Schema.Types.ObjectId },
        imageIndex: { type: Number },
        note: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
