const Batch = require('../Model/Batch.js');

const MAX_STUDENTS = 25;
const INSTITUTE_CODE = 'ABINS';
const YEAR = 2026;

const nextSuffix = (char) => String.fromCharCode(char.charCodeAt(0) + 1);

const assignBatchToStudent = async () => {
  let lastBatch = await Batch.findOne({ year: YEAR }).sort({
    seriesNumber: -1,
    suffix: -1,
  });

  // First batch
  if (!lastBatch) {
    const batch = await Batch.create({
      batchName: `${INSTITUTE_CODE}${YEAR}2001A`,
      year: YEAR,
      seriesNumber: 2001,
      suffix: 'A',
      studentCount: 1,
    });
    return batch.batchName;
  }

  // Space available
  if (lastBatch.studentCount < MAX_STUDENTS) {
    lastBatch.studentCount += 1;
    await lastBatch.save();
    return lastBatch.batchName;
  }

  // Create new batch
  let newSeries = lastBatch.seriesNumber;
  let newSuffix = nextSuffix(lastBatch.suffix);

  if (newSuffix > 'Z') {
    newSuffix = 'A';
    newSeries += 1;
  }

  const newBatch = await Batch.create({
    batchName: `${INSTITUTE_CODE}${YEAR}${newSeries}${newSuffix}`,
    year: YEAR,
    seriesNumber: newSeries,
    suffix: newSuffix,
    studentCount: 1,
  });

  return newBatch.batchName;
};

module.exports = { assignBatchToStudent };
