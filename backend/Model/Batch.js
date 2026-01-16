const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
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
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    schedule: {
      type: String,
      enum: ['weekdays', 'weekends', 'flexible'],
      default: 'weekdays',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    capacity: {
      type: Number,
      default: 50,
    },
    currentEnrollment: {
      type: Number,
      default: 0,
    },
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      lastModified: {
        type: Date,
        default: Date.now,
      },
      notes: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate displayName if not provided
batchSchema.pre('save', function (next) {
  if (!this.displayName) {
    this.displayName = this.batchName;
  }

  // Update student count from actual users
  if (this.isModified('batchName')) {
    // This would be updated by a separate function that counts users
    // For now, we'll keep the manual count
  }

  this.metadata.lastModified = Date.now();
  next();
});

// Index for compound queries
batchSchema.index({ year: 1, isActive: 1 });
batchSchema.index({ batchName: 1, isActive: 1 });
batchSchema.index({ startDate: 1, endDate: 1 });

// Virtual for full name
batchSchema.virtual('fullInfo').get(function () {
  return {
    name: this.batchName,
    displayName: this.displayName,
    year: this.year,
    series: this.seriesNumber,
    suffix: this.suffix,
    active: this.isActive,
    enrollment: `${this.currentEnrollment}/${this.capacity}`,
    schedule: this.schedule,
  };
});

// Static method to find active batches
batchSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ batchName: 1 });
};

// Static method to find batch by name (case-insensitive)
batchSchema.statics.findByName = function (name) {
  return this.findOne({
    batchName: new RegExp('^' + name + '$', 'i'),
  });
};

module.exports = mongoose.model('Batch', batchSchema);
