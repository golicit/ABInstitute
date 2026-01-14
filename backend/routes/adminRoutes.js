const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// All admin routes require authentication
router.use(authenticateToken);

// Get tutoring dashboard
router.get('/tutoring-dashboard', adminController.getTutoringDashboard);

// Activate student tutoring
router.post('/activate-tutoring', adminController.activateStudentTutoring);

// Bulk activate tutoring
router.post('/bulk-activate-tutoring', adminController.bulkActivateTutoring);

// Send notification to student
router.post('/send-notification', adminController.sendTutoringNotification);

module.exports = router;
