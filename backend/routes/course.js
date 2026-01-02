const express = require('express');
const router = express.Router();
const Courses = require('../Model/course');
const { authenticateToken, requirePaidUser } = require('../middleware/auth');

// Public – list courses
router.get('/', async (req, res) => {
  const courses = await Courses.find({});
  res.json({ success: true, data: courses });
});

// Paid – single course
router.get('/:id', authenticateToken, requirePaidUser, async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: 'Course not found' });
  }
  res.json({ success: true, data: course });
});

module.exports = router;
