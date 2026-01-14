const User = require('../Model/user');
const Batch = require('../Model/Batch.js');
const batchService = require('../services/batchService.js');

/**
 * CREATE STUDENT (Auto batch assignment)
 */
exports.createStudent = async (req, res) => {
  try {
    // Create student first
    const student = await User.create({
      ...req.body,
      role: 'user',
    });

    // Automatically assign batch
    const batchResult = await batchService.assignBatchToStudent(student._id);

    res.status(201).json({
      success: true,
      message: 'Student created successfully with batch assignment',
      student: {
        ...student.toObject(),
        batch: batchResult.batchName,
      },
      batch: {
        name: batchResult.batchName,
        studentCount: batchResult.studentCount,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create student',
    });
  }
};

/**
 * STUDENT PROFILE (Student can see batch)
 */
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select(
      'name email batch role tutoringStatus isPaidUser createdAt'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get batch details if student has a batch
    let batchDetails = null;
    if (student.batch) {
      const batch = await Batch.findOne({ batchName: student.batch });
      if (batch) {
        batchDetails = {
          name: batch.batchName,
          fullName: batch.fullName,
          studentCount: batch.studentCount,
          isFull: batch.isFull,
          createdAt: batch.createdAt,
        };
      }
    }

    res.json({
      success: true,
      student,
      batch: batchDetails,
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyBatchDetails = async (req, res) => {
  try {
    const student = await User.findById(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (!student.batch) {
      return res.status(404).json({
        success: false,
        message: 'No batch assigned to this student',
      });
    }

    const batch = await Batch.findOne({ batchName: student.batch });
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch details not found',
      });
    }

    // Get all students in this batch
    const batchStudents = await User.find({ batch: student.batch })
      .select('name email role createdAt')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      batch: {
        ...batch.toObject(),
        students: batchStudents,
        totalStudents: batchStudents.length,
      },
    });
  } catch (error) {
    console.error('Error getting batch details:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * MANUALLY ASSIGN BATCH TO USER (Admin only)
 */
exports.assignBatchToUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const result = await batchService.assignBatchToStudent(userId);

    res.json({
      success: true,
      message: result.message,
      batchName: result.batchName,
      studentCount: result.studentCount,
    });
  } catch (error) {
    console.error('Error assigning batch to user:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign batch',
    });
  }
};

/**
 * GET BATCH STATISTICS (Admin only)
 */
exports.getBatchStatistics = async (req, res) => {
  try {
    const stats = await batchService.getBatchStatistics();

    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('Error getting batch statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get batch statistics',
    });
  }
};
