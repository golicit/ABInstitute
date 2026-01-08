const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchName: { type: String, unique: true, required: true },
    year: { type: Number, required: true },
    seriesNumber: { type: Number, required: true },
    suffix: { type: String, required: true },
    studentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
