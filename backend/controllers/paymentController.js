const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../Model/Payment');
const User = require('../Model/user');

// Initialize Razorpay - CHECK YOUR KEYS!
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

// Create Razorpay order
exports.createOrder = async (req, res) => {
  console.log('=== CREATE ORDER CALLED ===');

  try {
    const userId = req.user._id;
    const amount = 100; // ₹1 in paise

    console.log('User ID:', userId);
    console.log('Amount:', amount);
    console.log('Razorpay Key ID present:', !!process.env.RAZORPAY_KEY_ID);
    console.log(
      'Razorpay Key Secret present:',
      !!process.env.RAZORPAY_KEY_SECRET
    );

    // Check if user already paid
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
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
    const receipt = `receipt_${timestamp}_${randomSuffix}`;

    console.log('Creating order with receipt:', receipt);

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: userId.toString(),
        purpose: 'course_enrollment',
        userEmail: user.email || 'no-email',
        timestamp: timestamp.toString(),
      },
    };

    console.log('Order options:', options);

    // Create order in Razorpay
    const order = await razorpay.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    // Save payment record as pending
    const payment = new Payment({
      user: userId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'pending',
    });

    await payment.save();
    console.log('✅ Payment record saved:', payment._id);

    // Update user with payment reference
    if (!user.payments) {
      user.payments = [];
    }
    user.payments.push(payment._id);
    await user.save();
    console.log('✅ User updated with payment reference');

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('❌ CREATE ORDER ERROR:', error);
    console.error('Error details:', {
      message: error.message,
      errorCode: error.error?.code,
      description: error.error?.description,
      httpStatusCode: error.statusCode,
      stack: error.stack,
    });

    // Check if it's a Razorpay authentication error
    if (error.statusCode === 401) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay authentication failed. Please check your API keys.',
      });
    }

    // Check if it's a duplicate receipt error
    if (
      error.error &&
      error.error.description &&
      error.error.description.includes('already exists')
    ) {
      console.log('Duplicate receipt detected, retrying with new receipt...');

      try {
        // Retry with a completely new receipt
        const userId = req.user._id;
        const timestamp = Date.now() + Math.floor(Math.random() * 10000);
        const randomSuffix = Math.floor(Math.random() * 10000);
        const newReceipt = `receipt_${timestamp}_${randomSuffix}`;

        const user = await User.findById(userId);

        const retryOptions = {
          amount: 100,
          currency: 'INR',
          receipt: newReceipt,
          notes: {
            userId: userId.toString(),
            purpose: 'course_enrollment',
            timestamp: timestamp.toString(),
          },
        };

        console.log('Retrying with new receipt:', newReceipt);

        const order = await razorpay.orders.create(retryOptions);

        // Save payment record
        const payment = new Payment({
          user: userId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          status: 'pending',
        });

        await payment.save();

        if (!user.payments) {
          user.payments = [];
        }
        user.payments.push(payment._id);
        await user.save();

        return res.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
          message: 'Order created successfully (retry)',
        });
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.error?.code || 'unknown',
    });
  }
};

// Verify payment
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

    // Verify the signature
    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Find or create payment record
    let payment = await Payment.findOne({
      orderId: razorpay_order_id,
      user: userId,
    });

    if (!payment) {
      // Create new payment record
      payment = new Payment({
        user: userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: 100,
        currency: 'INR',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'completed',
        paidAt: new Date(),
      });
    } else {
      // Update existing payment
      payment.paymentId = razorpay_payment_id;
      payment.razorpayOrderId = razorpay_order_id;
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'completed';
      payment.paidAt = new Date();
    }

    await payment.save();

    // Update user payment status
    const user = await User.findById(userId);
    user.paymentStatus = 'paid';
    user.isPaidUser = true;
    user.lastPaymentDate = new Date();

    // Add payment reference if not already present
    if (!user.payments.includes(payment._id)) {
      user.payments.push(payment._id);
    }

    await user.save();

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
      .select('amount currency status createdAt paidAt');

    const formattedPayments = payments.map((payment) => ({
      ...payment.toObject(),
      courseName: 'Course Enrollment Fee',
      date: payment.paidAt || payment.createdAt,
      id: payment._id,
    }));

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
