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
  });
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

module.exports = router;
