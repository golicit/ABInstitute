const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../Model/Payment');
const User = require('../Model/user');

// Initialize Razorpay with better error handling
let razorpay;
try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay API keys are missing in environment variables');
    throw new Error('Razorpay API keys not configured');
  }

  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log('✅ Razorpay initialized successfully');
  console.log('Key ID:', process.env.RAZORPAY_KEY_ID ? 'Present' : 'Missing');
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
  // Initialize with dummy instance to prevent crashes
  razorpay = {
    orders: {
      create: async () => {
        throw new Error('Razorpay not configured. Check API keys.');
      },
    },
  };
}

// ============== COURSE PAYMENT FUNCTIONS ==============

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('paymentStatus isPaidUser');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      isPaid: user.paymentStatus === 'paid' || user.isPaidUser === true,
      paymentStatus: user.paymentStatus,
      isPaidUser: user.isPaidUser,
    });
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create Razorpay order for course
exports.createOrder = async (req, res) => {
  console.log('=== CREATE COURSE ORDER ===');

  try {
    // Validate Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        errorCode: 'RAZORPAY_NOT_CONFIGURED',
      });
    }

    const userId = req.user._id;
    const amount = 100; // ₹1 in paise

    console.log('User ID:', userId);
    console.log('Amount:', amount);

    // Check if user already paid
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('User found, isPaidUser:', user.isPaidUser);

    if (user.isPaidUser) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed',
      });
    }

    // Create unique receipt
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const receipt = `course_${timestamp}_${randomSuffix}`;

    console.log('Creating order with receipt:', receipt);

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      payment_capture: 1, // Auto capture
      notes: {
        userId: userId.toString(),
        purpose: 'course_enrollment',
        userEmail: user.email || 'no-email',
        timestamp: timestamp.toString(),
        type: 'course',
      },
    };

    console.log('Order options:', options);

    // Create order in Razorpay
    console.log('Calling Razorpay API to create order...');
    const order = await razorpay.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    // Save payment record as pending
    try {
      const paymentData = {
        user: userId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: 'pending',
        gateway: 'razorpay',
        type: 'course',
        razorpayOrderId: order.id,
        metadata: {
          receipt: receipt,
          userId: userId.toString(),
          userEmail: user.email,
        },
      };

      const payment = await Payment.create(paymentData);
      console.log('✅ Payment record saved:', payment._id);

      // Update user with payment reference
      if (!user.payments) {
        user.payments = [];
      }
      user.payments.push(payment._id);
      await user.save();
      console.log('✅ User updated with payment reference');
    } catch (saveError) {
      console.error('❌ Error saving payment:', saveError.message);

      // Create payment without problematic fields
      const paymentData = {
        user: userId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: 'pending',
        gateway: 'razorpay',
        type: 'course',
        razorpayOrderId: order.id,
      };

      const payment = await Payment.create(paymentData);
      console.log('✅ Payment saved without metadata:', payment._id);

      if (!user.payments) {
        user.payments = [];
      }
      user.payments.push(payment._id);
      await user.save();
    }

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('❌ CREATE ORDER ERROR:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);

    if (error.statusCode === 401) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay authentication failed. Check API keys.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Verify course payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const userId = req.user._id;

    console.log('Verifying payment for user:', userId);

    // Generate signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature',
      });
    }

    // Find or create payment record
    let payment = await Payment.findOne({
      orderId: razorpay_order_id,
      user: userId,
    });

    if (!payment) {
      console.log('Creating new payment record for order:', razorpay_order_id);
      payment = new Payment({
        user: userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: 100,
        currency: 'INR',
        gateway: 'razorpay',
        type: 'course',
        gatewayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'completed',
        paidAt: new Date(),
      });
    } else {
      console.log('Updating existing payment record:', payment._id);
      payment.paymentId = razorpay_payment_id;
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.razorpayOrderId = razorpay_order_id;
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'completed';
      payment.paidAt = new Date();
    }

    await payment.save();
    console.log('✅ Payment record saved/updated:', payment._id);

    // Update user payment status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.paymentStatus = 'paid';
    user.isPaidUser = true;
    user.lastPaymentDate = new Date();

    if (!user.payments.includes(payment._id)) {
      user.payments.push(payment._id);
    }

    await user.save();
    console.log('✅ User payment status updated');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: payment._id,
      isPaidUser: true,
    });
  } catch (error) {
    console.error('Verify payment error:', error);

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .select(
        'amount currency status createdAt paidAt gateway type tutoringType'
      );

    const formattedPayments = payments.map((payment) => {
      let name = 'Course Enrollment Fee';
      if (payment.type === 'tutoring') {
        name = 'Private Tutoring Package';
      }

      return {
        ...payment.toObject(),
        courseName: name,
        date: payment.paidAt || payment.createdAt,
        id: payment._id,
      };
    });

    res.json({
      success: true,
      payments: formattedPayments,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
};

// ============== TUTORING PAYMENT FUNCTIONS ==============

// Create tutoring order
exports.createTutoringOrder = async (req, res) => {
  console.log('=== CREATE TUTORING ORDER ===');

  try {
    // Validate Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        errorCode: 'RAZORPAY_NOT_CONFIGURED',
      });
    }

    const userId = req.user._id;
    const amount = 100; // ₹1 in paise for demo

    console.log('Tutoring Order - User ID:', userId);
    console.log('Tutoring Order - Amount:', amount);

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please login again.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    // Check if user has purchased main course
    if (!user.isPaidUser) {
      return res.status(400).json({
        success: false,
        message: 'Please purchase the main course first.',
        errorCode: 'COURSE_NOT_PURCHASED',
        redirectUrl: '/dashboard/explore',
      });
    }

    // Check if tutoring already purchased
    if (user.tutoringStatus && user.tutoringStatus !== 'none') {
      return res.status(400).json({
        success: false,
        message: 'Tutoring already purchased.',
        errorCode: 'TUTORING_ALREADY_PURCHASED',
        currentStatus: user.tutoringStatus,
      });
    }

    // Create unique receipt for tutoring
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const receipt = `tutoring_${timestamp}_${randomSuffix}`;

    console.log('Creating tutoring order with receipt:', receipt);

    // Create order options
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      payment_capture: 1, // Auto capture payment
      notes: {
        userId: userId.toString(),
        purpose: 'private_tutoring',
        userEmail: user.email || 'no-email',
        timestamp: timestamp.toString(),
        type: 'tutoring',
      },
    };

    console.log('Tutoring order options:', options);

    // Create Razorpay order
    let order;
    try {
      order = await razorpay.orders.create(options);
      console.log('✅ Razorpay order created:', order.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', razorpayError);

      if (razorpayError.statusCode === 401) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway authentication failed. Invalid API keys.',
          errorCode: 'RAZORPAY_AUTH_FAILED',
        });
      }

      if (razorpayError.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment request. Please try again.',
          errorCode: 'INVALID_REQUEST',
        });
      }

      throw razorpayError;
    }

    // Save payment record
    const paymentData = {
      user: userId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'pending',
      gateway: 'razorpay',
      type: 'tutoring',
      tutoringType: 'private_mentorship',
      razorpayOrderId: order.id,
      metadata: {
        receipt: receipt,
        userId: userId.toString(),
        userEmail: user.email,
      },
    };

    const payment = await Payment.create(paymentData);
    console.log('✅ Payment record saved:', payment._id);

    // Update user tutoring status
    user.tutoringStatus = 'pending';
    user.tutoringPurchasedAt = new Date();
    user.mentorAvailabilityNotified = false;

    if (!user.payments) user.payments = [];
    if (!user.tutoringOrders) user.tutoringOrders = [];

    user.payments.push(payment._id);
    user.tutoringOrders.push(payment._id);
    await user.save();

    console.log('✅ User updated with tutoring status');

    // Return success response
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      name: 'AB Institute - Private Mentorship',
      description: '1-on-1 Tutoring Session with Mentor',
      prefill: {
        name: user.name || '',
        email: user.email,
        contact: user.phone || '',
      },
      theme: {
        color: '#14b8a6',
      },
      notes: {
        userId: userId.toString(),
        purpose: 'private_tutoring',
      },
      callback_url: `${
        process.env.FRONTEND_URL || 'http://localhost:3000'
      }/dashboard/tutoring-sessions?payment=success`,
      cancel_url: `${
        process.env.FRONTEND_URL || 'http://localhost:3000'
      }/dashboard/explore?payment=cancelled`,
      message: 'Tutoring order created successfully',
    });
  } catch (error) {
    console.error('❌ CREATE TUTORING ORDER ERROR:', error);

    let errorMessage = 'Failed to create tutoring order.';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;

    if (error.name === 'MongoError') {
      errorMessage = 'Database error occurred. Please try again.';
      errorCode = 'DATABASE_ERROR';
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid data provided.';
      errorCode = 'VALIDATION_ERROR';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      errorCode: errorCode,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Verify tutoring payment
exports.verifyTutoringPayment = async (req, res) => {
  console.log('=== VERIFY TUTORING PAYMENT ===');

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const userId = req.user._id;

    console.log('Verifying payment for user:', userId);
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data.',
        errorCode: 'MISSING_DATA',
      });
    }

    // Generate signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    console.log(
      'Expected Signature:',
      expectedSignature.substring(0, 20) + '...'
    );
    console.log(
      'Received Signature:',
      razorpay_signature.substring(0, 20) + '...'
    );

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('❌ Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
        errorCode: 'INVALID_SIGNATURE',
      });
    }

    console.log('✅ Signature verified successfully');

    // Find payment record
    let payment = await Payment.findOne({
      orderId: razorpay_order_id,
      user: userId,
      type: 'tutoring',
    });

    if (!payment) {
      console.log('Creating new payment record');
      payment = new Payment({
        user: userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: 100,
        currency: 'INR',
        gateway: 'razorpay',
        type: 'tutoring',
        tutoringType: 'private_mentorship',
        gatewayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'completed',
        paidAt: new Date(),
      });
    } else {
      console.log('Updating existing payment record:', payment._id);
      payment.paymentId = razorpay_payment_id;
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.razorpayOrderId = razorpay_order_id;
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'completed';
      payment.paidAt = new Date();
    }

    await payment.save();
    console.log('✅ Payment record saved:', payment._id);

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    user.tutoringStatus = 'pending'; // Will be activated by mentor later
    user.tutoringPurchasedAt = new Date();
    user.mentorAvailabilityNotified = false;

    if (!user.payments) user.payments = [];
    if (!user.tutoringOrders) user.tutoringOrders = [];

    // Add payment reference if not already present
    if (!user.payments.some((p) => p.toString() === payment._id.toString())) {
      user.payments.push(payment._id);
    }
    if (
      !user.tutoringOrders.some((p) => p.toString() === payment._id.toString())
    ) {
      user.tutoringOrders.push(payment._id);
    }

    await user.save();
    console.log('✅ User updated successfully');

    // Return success with additional data for frontend
    res.json({
      success: true,
      message: 'Payment verified successfully!',
      paymentId: payment._id,
      tutoringStatus: 'pending',
      type: 'tutoring',
      userData: {
        tutoringStatus: 'pending',
        tutoringPurchasedAt: user.tutoringPurchasedAt,
      },
      redirectUrl: '/dashboard/tutoring-sessions?payment=success',
    });
  } catch (error) {
    console.error('❌ VERIFY TUTORING PAYMENT ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please contact support.',
      errorCode: 'VERIFICATION_FAILED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get tutoring status
exports.getTutoringStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      'tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified isPaidUser paymentStatus'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      tutoringStatus: user.tutoringStatus || 'none',
      tutoringPurchasedAt: user.tutoringPurchasedAt || null,
      mentorAvailabilityNotified: user.mentorAvailabilityNotified || false,
      hasPurchasedMainCourse: user.isPaidUser || false,
    });
  } catch (error) {
    console.error('Get tutoring status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutoring status',
    });
  }
};

// Activate tutoring (when mentor is available)
exports.activateTutoring = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has purchased tutoring
    if (!user.tutoringStatus || user.tutoringStatus === 'none') {
      return res.status(400).json({
        success: false,
        message: 'User has not purchased tutoring',
      });
    }

    // Activate tutoring
    user.tutoringStatus = 'active';
    user.mentorAvailabilityNotified = false; // Reset for notification
    await user.save();

    console.log(`✅ Tutoring activated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Tutoring activated successfully',
      tutoringStatus: 'active',
    });
  } catch (error) {
    console.error('Activate tutoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate tutoring',
    });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.mentorAvailabilityNotified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification',
    });
  }
};

// Get all tutoring purchases (admin)
exports.getAllTutoringPurchases = async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Find all tutoring payments
    const tutoringPayments = await Payment.find({ type: 'tutoring' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Get users with tutoring
    const usersWithTutoring = await User.find({
      tutoringStatus: { $ne: 'none' },
    }).select(
      'name email tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified'
    );

    res.json({
      success: true,
      tutoringPayments,
      usersWithTutoring,
      total: tutoringPayments.length,
    });
  } catch (error) {
    console.error('Get all tutoring purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutoring purchases',
    });
  }
};
