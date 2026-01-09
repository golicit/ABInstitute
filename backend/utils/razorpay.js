const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test Razorpay connection
const testRazorpayConnection = async () => {
  try {
    // Try to fetch a single payment to test connection
    const payments = await razorpay.payments.all({ count: 1 });
    console.log('✅ Razorpay connection successful');
    return true;
  } catch (error) {
    console.error('❌ Razorpay connection failed:', error.message);
    return false;
  }
};

// Create order
const createRazorpayOrder = async (options) => {
  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw error;
  }
};

// Verify payment signature
const verifyPaymentSignature = (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Payment signature verification error:', error);
    return false;
  }
};

// Fetch payment details
const fetchPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Fetch payment details error:', error);
    throw error;
  }
};

module.exports = {
  razorpay,
  testRazorpayConnection,
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
};
