const express = require('express');
const {
  createStudent,
  getStudentProfile,
  getMyBatchDetails,
} = require('../controllers/studentController');
// Import the correct function from auth.js
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/create', createStudent);
router.get('/me', authenticateToken, getStudentProfile);
router.get('/my-batch', authenticateToken, getMyBatchDetails);

module.exports = router;
