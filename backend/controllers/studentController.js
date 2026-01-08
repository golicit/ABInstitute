const Student = require('../Model/Student.js');
const Batch = require('../Model/Batch.js');
const { assignBatchToStudent } = require('../services/batchService.js');

/**
 * CREATE STUDENT (Auto batch assignment)
 */
exports.createStudent = async (req, res) => {
  try {
    const batchName = await assignBatchToStudent();

    const student = await Student.create({
      ...req.body,
      batch: batchName,
    });

    res.status(201).json({
      message: 'Student created successfully',
      student,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * STUDENT PROFILE (Student can see batch)
 */
exports.getStudentProfile = async (req, res) => {
  try {
    // Your auth middleware attaches full user object to req.user
    const student = await Student.findById(req.user._id).select(
      'name email batch'
    );

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyBatchDetails = async (req, res) => {
  try {
    // Use req.user._id since auth middleware attaches full user
    const student = await Student.findById(req.user._id);
    const batch = await Batch.findOne({ batchName: student.batch });

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
2;
