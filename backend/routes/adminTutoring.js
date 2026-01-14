const express = require('express');
const router = express.Router();
const User = require('../Model/user');
const Notification = require('../Model/Notification');
const Payment = require('../Model/Payment');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && ['admin', 'owner'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied' });
  }
};

// Apply admin middleware to all routes
router.use(isAdmin);

// GET: Fetch tutoring dashboard data - FIXED VERSION
router.get('/tutoring-dashboard', async (req, res) => {
  try {
    console.log('=== FETCHING TUTORING DASHBOARD ===');

    // Find users who have purchased tutoring - FIXED QUERY
    const users = await User.find({
      tutoringStatus: { $ne: 'none' }, // Changed from 'tutoring.purchased': true
    })
      .select(
        'name email tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified role createdAt tutoringOrders'
      )
      .sort({ tutoringPurchasedAt: -1 });

    console.log(`Found ${users.length} users with tutoring purchases`);

    // Debug: Log first few users
    if (users.length > 0) {
      console.log('Sample users found:');
      users.slice(0, 3).forEach((user, index) => {
        console.log(
          `${index + 1}. ${user.name} (${user.email}) - Status: ${
            user.tutoringStatus
          }, Purchased: ${user.tutoringPurchasedAt}`
        );
      });
    }

    // Transform users to match expected format
    const transformedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tutoringStatus: user.tutoringStatus,
      tutoringPurchasedAt: user.tutoringPurchasedAt,
      mentorAvailabilityNotified: user.mentorAvailabilityNotified,
      createdAt: user.createdAt,
      tutoring: {
        purchased: user.tutoringStatus !== 'none',
        status: user.tutoringStatus,
        purchasedAt: user.tutoringPurchasedAt,
        mentorAvailabilityNotified: user.mentorAvailabilityNotified,
      },
    }));

    // Categorize users
    const pendingUsers = transformedUsers.filter(
      (user) => user.tutoringStatus === 'pending'
    );
    const activeUsers = transformedUsers.filter(
      (user) => user.tutoringStatus === 'active'
    );
    const completedUsers = transformedUsers.filter(
      (user) => user.tutoringStatus === 'completed'
    );

    // Calculate stats
    const stats = {
      total: transformedUsers.length,
      pending: pendingUsers.length,
      active: activeUsers.length,
      completed: completedUsers.length,
    };

    console.log('Dashboard stats:', stats);

    res.json({
      success: true,
      stats,
      pendingUsers,
      activeUsers,
      completedUsers,
      allUsers: transformedUsers,
    });
  } catch (error) {
    console.error('Error fetching tutoring dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// POST: Activate tutoring for a single student - FIXED VERSION
router.post('/activate-tutoring', async (req, res) => {
  try {
    const { userId } = req.body;

    console.log(`Activating tutoring for user: ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Check if user has purchased tutoring - FIXED CHECK
    if (user.tutoringStatus === 'none') {
      return res.status(400).json({
        success: false,
        message: 'User has not purchased tutoring',
      });
    }

    if (user.tutoringStatus === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Tutoring is already active for this user',
      });
    }

    // Update tutoring status - FIXED FIELDS
    user.tutoringStatus = 'active';
    user.mentorAvailabilityNotified = false;

    // Also update the nested tutoring object if it exists
    if (user.tutoring) {
      user.tutoring.status = 'active';
      user.tutoring.activatedAt = new Date();
      user.tutoring.activatedBy = req.user._id;
      user.tutoring.mentorAvailabilityNotified = false;
    }

    await user.save();

    console.log(`✅ Tutoring activated for user: ${user.name} (${user.email})`);

    // Log the activation
    await Notification.create({
      userId: user._id,
      type: 'tutoring_activated',
      title: 'Tutoring Session Activated',
      message: `Your tutoring session has been activated by ${req.user.name}`,
      sentBy: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      message: 'Tutoring activated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tutoringStatus: user.tutoringStatus,
      },
    });
  } catch (error) {
    console.error('Error activating tutoring:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// POST: Bulk activate tutoring - FIXED VERSION
router.post('/bulk-activate-tutoring', async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid user IDs' });
    }

    console.log(`Bulk activating tutoring for ${userIds.length} users`);

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);

        if (!user) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        // Check if user has purchased tutoring - FIXED CHECK
        if (user.tutoringStatus === 'none') {
          errors.push({ userId, error: 'User has not purchased tutoring' });
          continue;
        }

        if (user.tutoringStatus === 'active') {
          errors.push({ userId, error: 'Tutoring already active' });
          continue;
        }

        // Update tutoring status - FIXED FIELDS
        user.tutoringStatus = 'active';
        user.mentorAvailabilityNotified = false;

        // Also update the nested tutoring object if it exists
        if (user.tutoring) {
          user.tutoring.status = 'active';
          user.tutoring.activatedAt = new Date();
          user.tutoring.activatedBy = req.user._id;
          user.tutoring.mentorAvailabilityNotified = false;
        }

        await user.save();

        // Create notification
        await Notification.create({
          userId: user._id,
          type: 'tutoring_activated',
          title: 'Tutoring Session Activated',
          message: `Your tutoring session has been activated by ${req.user.name}`,
          sentBy: req.user._id,
          read: false,
        });

        results.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          status: 'activated',
        });

        console.log(`✅ Activated tutoring for: ${user.name}`);
      } catch (err) {
        errors.push({ userId, error: err.message });
        console.error(`❌ Error activating user ${userId}:`, err.message);
      }
    }

    console.log(
      `Bulk activation complete: ${results.length} successful, ${errors.length} errors`
    );

    res.json({
      success: true,
      message: `Processed ${userIds.length} users`,
      results,
      errors,
    });
  } catch (error) {
    console.error('Error in bulk activation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// POST: Send notification to student - FIXED VERSION
router.post('/send-notification', async (req, res) => {
  try {
    const { userId, type, message } = req.body;

    console.log(`Sending notification to user: ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Check tutoring status - FIXED CHECK
    if (user.tutoringStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send notification: tutoring not active',
      });
    }

    // Create notification
    const notification = await Notification.create({
      userId: user._id,
      type: type || 'mentor_available',
      title: 'Mentor Available for Tutoring',
      message:
        message ||
        'Your mentor is now available for tutoring sessions! Please schedule your session.',
      sentBy: req.user._id,
      read: false,
    });

    // Update user's notification flag - FIXED FIELDS
    user.mentorAvailabilityNotified = true;

    // Also update the nested tutoring object if it exists
    if (user.tutoring) {
      user.tutoring.mentorAvailabilityNotified = true;
      user.tutoring.lastNotifiedAt = new Date();
    }

    await user.save();

    console.log(`✅ Notification sent to: ${user.name} (${user.email})`);

    // TODO: Here you would integrate with email service (SendGrid, etc.)
    // await sendTutoringNotificationEmail(user.email, user.name, message);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      notification: {
        type: notification.type,
        message: notification.message,
        sentAt: notification.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET: Search students - FIXED VERSION
router.get('/search-students', async (req, res) => {
  try {
    const { query, status } = req.query;

    console.log(`Searching students - Query: "${query}", Status: "${status}"`);

    let filter = {
      tutoringStatus: { $ne: 'none' }, // Changed from 'tutoring.purchased': true
    };

    // Add search query filter
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      filter['tutoringStatus'] = status; // Changed from 'tutoring.status'
    }

    const users = await User.find(filter)
      .select(
        'name email tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified'
      ) // Fixed field names
      .sort({ tutoringPurchasedAt: -1 })
      .limit(50);

    console.log(`Found ${users.length} students matching criteria`);

    res.json({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        tutoringStatus: user.tutoringStatus,
        tutoringPurchasedAt: user.tutoringPurchasedAt,
        mentorAvailabilityNotified: user.mentorAvailabilityNotified,
        tutoring: {
          status: user.tutoringStatus,
          purchasedAt: user.tutoringPurchasedAt,
          mentorAvailabilityNotified: user.mentorAvailabilityNotified,
        },
      })),
    });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// DEBUG ENDPOINT: Check user tutoring data
router.get('/debug-users', async (req, res) => {
  try {
    const users = await User.find({})
      .select(
        'name email tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified tutoring tutoringOrders'
      )
      .sort({ tutoringPurchasedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      totalUsers: users.length,
      users: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        tutoringStatus: user.tutoringStatus,
        tutoringPurchasedAt: user.tutoringPurchasedAt,
        mentorAvailabilityNotified: user.mentorAvailabilityNotified,
        hasTutoringObject: !!user.tutoring,
        tutoringObject: user.tutoring,
        tutoringOrdersCount: user.tutoringOrders
          ? user.tutoringOrders.length
          : 0,
      })),
      summary: {
        none: users.filter((u) => u.tutoringStatus === 'none').length,
        pending: users.filter((u) => u.tutoringStatus === 'pending').length,
        active: users.filter((u) => u.tutoringStatus === 'active').length,
        completed: users.filter((u) => u.tutoringStatus === 'completed').length,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DEBUG ENDPOINT: Check payments data
router.get('/debug-payments', async (req, res) => {
  try {
    const payments = await Payment.find({ type: 'tutoring' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      totalTutoringPayments: payments.length,
      payments: payments.map((p) => ({
        _id: p._id,
        orderId: p.orderId,
        paymentId: p.paymentId,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        user: p.user
          ? {
              _id: p.user._id,
              name: p.user.name,
              email: p.user.email,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Debug payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
