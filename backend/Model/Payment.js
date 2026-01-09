const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
    },
    gateway: {
      type: String,
      default: 'razorpay',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['course', 'tutoring'],
      default: 'course',
    },
    tutoringType: {
      type: String,
      enum: ['private_mentorship', null],
      default: null,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    metadata: {
      type: Object,
      default: {},
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ gatewayPaymentId: 1 }, { sparse: true });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ user: 1, type: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
