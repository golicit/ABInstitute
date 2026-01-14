// routes/students.js
const express = require('express');
const router = express.Router();
const User = require('../Model/user');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all active students (for admin)
router.get('/active', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      isPaidUser: true, // Only paid students
    })
      .select('name email batch')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
});

// Search students
router.get('/search', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { query } = req.query;

    const searchFilter = {
      role: 'student',
      isPaidUser: true,
    };

    if (query) {
      searchFilter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { batch: { $regex: query, $options: 'i' } },
      ];
    }

    const students = await User.find(searchFilter)
      .select('name email batch')
      .limit(20);

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search students',
      error: error.message,
    });
  }
});

// Get student by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select(
      'name email batch phone tutoringStatus'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message,
    });
  }
});

module.exports = router;
