const User = require('../Model/user');

// Admin/Mentor dashboard for managing tutoring
exports.getTutoringDashboard = async (req, res) => {
  try {
    // Check if admin/mentor
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Get all users with tutoring purchases
    const usersWithTutoring = await User.find({
      tutoringStatus: { $ne: 'none' },
    }).select(
      'name email tutoringStatus tutoringPurchasedAt mentorAvailabilityNotified createdAt'
    );

    // Get pending tutoring users
    const pendingUsers = usersWithTutoring.filter(
      (user) => user.tutoringStatus === 'pending'
    );
    const activeUsers = usersWithTutoring.filter(
      (user) => user.tutoringStatus === 'active'
    );
    const completedUsers = usersWithTutoring.filter(
      (user) => user.tutoringStatus === 'completed'
    );

    res.json({
      success: true,
      stats: {
        total: usersWithTutoring.length,
        pending: pendingUsers.length,
        active: activeUsers.length,
        completed: completedUsers.length,
      },
      pendingUsers,
      activeUsers,
      completedUsers,
    });
  } catch (error) {
    console.error('Get tutoring dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutoring dashboard',
    });
  }
};

// Activate tutoring for a student
exports.activateStudentTutoring = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if admin/mentor
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
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
    user.mentorAvailabilityNotified = false; // Reset notification flag
    await user.save();

    console.log(`✅ Tutoring activated for user: ${user.name} (${user.email})`);

    // Here you could send email notification
    // sendTutoringActivatedEmail(user.email, user.name);

    res.json({
      success: true,
      message: `Tutoring activated for ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        tutoringStatus: user.tutoringStatus,
      },
    });
  } catch (error) {
    console.error('Activate student tutoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate tutoring',
    });
  }
};

// Activate multiple students at once
exports.bulkActivateTutoring = async (req, res) => {
  try {
    const { userIds } = req.body;

    // Check if admin/mentor
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        if (user.tutoringStatus === 'pending') {
          user.tutoringStatus = 'active';
          user.mentorAvailabilityNotified = false;
          await user.save();

          results.push({
            userId,
            name: user.name,
            email: user.email,
            status: 'activated',
          });

          console.log(`✅ Activated: ${user.name} (${user.email})`);
        } else {
          results.push({
            userId,
            name: user.name,
            email: user.email,
            status: 'already_active',
          });
        }
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Activated ${
        results.filter((r) => r.status === 'activated').length
      } users`,
      results,
      errors,
    });
  } catch (error) {
    console.error('Bulk activate tutoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk activate tutoring',
    });
  }
};

// Send notification to student
exports.sendTutoringNotification = async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    // Check if admin/mentor
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
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

    // Update notification flag
    user.mentorAvailabilityNotified = false; // Set to false to trigger notification
    await user.save();

    // Here you would send email/push notification
    // sendNotificationEmail(user.email, message);

    console.log(
      `📧 Notification sent to ${user.name} (${user.email}): ${message}`
    );

    res.json({
      success: true,
      message: 'Notification sent successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      notification: {
        type,
        message,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
    });
  }
};
