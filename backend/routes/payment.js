const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Test endpoint (no auth required)
router.get('/test-connection', (req, res) => {
  res.json({
    success: true,
    razorpayConfigured:
      !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET,
    keyIdPresent: !!process.env.RAZORPAY_KEY_ID,
    keySecretPresent: !!process.env.RAZORPAY_KEY_SECRET,
    environment: process.env.NODE_ENV,
    timestamp: new Date(),
    serverTime: new Date().toISOString(),
    message: 'Payment server is running',
  });
});

// Test Razorpay keys endpoint (no auth required)
router.get('/test-razorpay', async (req, res) => {
  try {
    const Razorpay = require('razorpay');

    // Test Razorpay initialization
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Try to fetch payments (just to test connection)
    const payments = await razorpay.payments.all({ count: 1 });

    res.json({
      success: true,
      message: 'Razorpay keys are valid!',
      keyId: process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Missing',
      keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Configured' : 'Missing',
      testResult: 'Connection successful',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Razorpay test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Razorpay test failed',
      error: error.message,
      keyId: process.env.RAZORPAY_KEY_ID ? 'Present' : 'Missing',
      keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing',
      help: 'Check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file',
    });
  }
});

// All other payment routes require authentication
router.use(authenticateToken);

// Check payment status
router.get('/status', paymentController.checkPaymentStatus);

// Create Razorpay order
router.post('/create-order', paymentController.createOrder);

// Verify payment
router.post('/verify', paymentController.verifyPayment);

// Get payment history
router.get('/history', paymentController.getPaymentHistory);

// Tutoring Payment Routes
router.post('/create-tutoring-order', paymentController.createTutoringOrder);
router.post('/verify-tutoring', paymentController.verifyTutoringPayment);
router.get('/tutoring-status', paymentController.getTutoringStatus);
router.post('/mark-notification-read', paymentController.markNotificationRead);

// Admin routes for tutoring
router.post('/activate-tutoring', paymentController.activateTutoring);
router.get(
  '/all-tutoring-purchases',
  paymentController.getAllTutoringPurchases
);

module.exports = router;
