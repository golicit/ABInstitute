const express = require('express');
const router = express.Router();
const User = require('../Model/user');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get students who have purchased tutoring (for 1:1 sessions)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('=== FETCHING STUDENTS FOR 1:1 SESSIONS ===');

    // FIRST: Let's see what's actually in the database
    const allUsers = await User.find({})
      .select('name email tutoringStatus tutoringPurchasedAt')
      .limit(20);

    console.log('=== ALL USERS IN DATABASE (first 20) ===');
    allUsers.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.name} - tutoringStatus: "${
          user.tutoringStatus
        }", purchasedAt: ${user.tutoringPurchasedAt}`
      );
    });

    // Now query for users with tutoring
    const students = await User.find({
      tutoringStatus: { $ne: 'none' },
    })
      .select('name email batch tutoringStatus tutoringPurchasedAt')
      .sort({ name: 1 });

    console.log(`=== QUERY RESULTS ===`);
    console.log(`Query: tutoringStatus: { $ne: 'none' }`);
    console.log(
      `Found ${students.length} students with tutoringStatus not "none"`
    );

    if (students.length > 0) {
      students.forEach((student, index) => {
        console.log(
          `${index + 1}. ${student.name} - Status: "${student.tutoringStatus}"`
        );
      });
    } else {
      console.log('No students found with tutoringStatus != "none"');
      // Maybe the field is empty/null instead of "none"
      console.log('Checking for empty/null tutoringStatus...');

      const usersWithEmptyStatus = await User.find({
        $or: [
          { tutoringStatus: { $exists: false } },
          { tutoringStatus: null },
          { tutoringStatus: '' },
          { tutoringStatus: { $eq: undefined } },
        ],
      })
        .select('name email tutoringStatus')
        .limit(10);

      console.log(
        `Found ${usersWithEmptyStatus.length} users with empty/null tutoringStatus`
      );
    }

    // Transform data to consistent format
    const formattedStudents = students.map((student) => {
      const studentObj = student.toObject();

      return {
        _id: studentObj._id,
        name: studentObj.name,
        email: studentObj.email,
        batch: studentObj.batch || '',
        tutoringStatus: studentObj.tutoringStatus || 'none',
        tutoring: {
          status: studentObj.tutoringStatus || 'none',
          purchasedAt: studentObj.tutoringPurchasedAt || null,
        },
      };
    });

    res.json({
      success: true,
      data: formattedStudents,
      count: formattedStudents.length,
      debug: {
        totalUsersInQuery: students.length,
        sampleUsers: students.slice(0, 3).map((u) => ({
          name: u.name,
          tutoringStatus: u.tutoringStatus,
        })),
      },
      message:
        formattedStudents.length > 0
          ? `Found ${formattedStudents.length} students with tutoring`
          : 'No students with tutoring found',
    });
  } catch (error) {
    console.error('Error fetching tutoring students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutoring students',
      error: error.message,
    });
  }
});

// DEBUG endpoint to check user data structure
router.get(
  '/debug/tutoring-data',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // Get all users with any tutoring-related fields
      const users = await User.find({})
        .select(
          'name email tutoringStatus tutoringPurchasedAt tutoring tutoringOrders isPaidUser paymentStatus'
        )
        .limit(50);

      // Check different patterns
      const usersWithTutoringStatus = users.filter(
        (u) => u.tutoringStatus && u.tutoringStatus !== 'none'
      );
      const usersWithNestedTutoring = users.filter(
        (u) => u.tutoring && u.tutoring.status
      );
      const usersWithTutoringOrders = users.filter(
        (u) => u.tutoringOrders && u.tutoringOrders.length > 0
      );
      const paidUsers = users.filter((u) => u.isPaidUser === true);

      res.json({
        success: true,
        stats: {
          totalUsersChecked: users.length,
          usersWithTutoringStatus: usersWithTutoringStatus.length,
          usersWithNestedTutoring: usersWithNestedTutoring.length,
          usersWithTutoringOrders: usersWithTutoringOrders.length,
          paidUsers: paidUsers.length,
        },
        sampleUsers: users.slice(0, 10).map((user) => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          tutoringStatus: user.tutoringStatus,
          tutoringPurchasedAt: user.tutoringPurchasedAt,
          hasTutoringObject: !!user.tutoring,
          tutoringObject: user.tutoring,
          tutoringOrdersCount: user.tutoringOrders
            ? user.tutoringOrders.length
            : 0,
          isPaidUser: user.isPaidUser,
          paymentStatus: user.paymentStatus,
        })),
        usersWithTutoringStatus: usersWithTutoringStatus.map((u) => ({
          name: u.name,
          tutoringStatus: u.tutoringStatus,
          tutoringPurchasedAt: u.tutoringPurchasedAt,
        })),
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ALTERNATIVE: Try different query patterns
router.get(
  '/alternative',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log('=== TRYING ALTERNATIVE QUERIES ===');

      // Try different query patterns to find students with tutoring

      // Pattern 1: Check if tutoringPurchasedAt exists
      const pattern1 = await User.find({
        tutoringPurchasedAt: { $exists: true, $ne: null },
      }).select('name email tutoringStatus tutoringPurchasedAt');

      console.log(
        `Pattern 1 (tutoringPurchasedAt exists): ${pattern1.length} users`
      );

      // Pattern 2: Check for nested tutoring object
      const pattern2 = await User.find({
        'tutoring.purchased': true,
      }).select('name email tutoring');

      console.log(
        `Pattern 2 (tutoring.purchased: true): ${pattern2.length} users`
      );

      // Pattern 3: Check for tutoring orders
      const pattern3 = await User.find({
        tutoringOrders: { $exists: true, $ne: [] },
      }).select('name email tutoringOrders');

      console.log(`Pattern 3 (has tutoringOrders): ${pattern3.length} users`);

      // Pattern 4: Combination - paid users with any tutoring indicator
      const pattern4 = await User.find({
        isPaidUser: true,
        $or: [
          { tutoringStatus: { $ne: 'none' } },
          { tutoringPurchasedAt: { $exists: true, $ne: null } },
          { 'tutoring.purchased': true },
          { tutoringOrders: { $exists: true, $ne: [] } },
        ],
      }).select(
        'name email tutoringStatus tutoringPurchasedAt tutoring tutoringOrders isPaidUser'
      );

      console.log(
        `Pattern 4 (paid + any tutoring indicator): ${pattern4.length} users`
      );

      // Use pattern 4 as results
      const formattedStudents = pattern4.map((student) => {
        const studentObj = student.toObject();

        return {
          _id: studentObj._id,
          name: studentObj.name,
          email: studentObj.email,
          batch: studentObj.batch || '',
          tutoringStatus: studentObj.tutoringStatus || 'none',
          tutoring: studentObj.tutoring || {
            status: 'none',
            purchasedAt: null,
          },
          tutoringPurchasedAt: studentObj.tutoringPurchasedAt || null,
          isPaidUser: studentObj.isPaidUser || false,
        };
      });

      res.json({
        success: true,
        data: formattedStudents,
        count: formattedStudents.length,
        debug: {
          pattern1: pattern1.length,
          pattern2: pattern2.length,
          pattern3: pattern3.length,
          pattern4: pattern4.length,
          queryUsed: 'Pattern 4 - paid + any tutoring indicator',
        },
        message: `Found ${formattedStudents.length} students with tutoring`,
      });
    } catch (error) {
      console.error('Error in alternative query:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students',
        error: error.message,
      });
    }
  }
);

// Get student details for tutoring
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select(
      'name email batch phone tutoringStatus tutoringPurchasedAt tutoring tutoringOrders isPaidUser'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentObj = student.toObject();

    const formattedStudent = {
      _id: studentObj._id,
      name: studentObj.name,
      email: studentObj.email,
      batch: studentObj.batch || '',
      phone: studentObj.phone || '',
      tutoringStatus: studentObj.tutoringStatus || 'none',
      tutoring: studentObj.tutoring || { status: 'none', purchasedAt: null },
      tutoringPurchasedAt: studentObj.tutoringPurchasedAt || null,
      isPaidUser: studentObj.isPaidUser || false,
    };

    res.json({
      success: true,
      data: formattedStudent,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message,
    });
  }
});

module.exports = router;
