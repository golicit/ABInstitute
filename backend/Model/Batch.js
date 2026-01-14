const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    seriesNumber: {
      type: Number,
      required: true,
    },
    suffix: {
      type: String,
      required: true,
    },
    studentCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 25,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFull: {
      type: Boolean,
      default: false,
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
  { timestamps: true }
);

// Pre-save middleware to update isFull
batchSchema.pre('save', function (next) {
  this.isFull = this.studentCount >= 25;
  this.updatedAt = new Date();
  next();
});

// Method to check if batch can accept more students
batchSchema.methods.canAcceptStudent = function () {
  return this.studentCount < 25 && this.isActive;
};

module.exports = mongoose.model('Batch', batchSchema);
