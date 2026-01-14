const express = require('express');
const router = express.Router();
const ClassSchedule = require('../Model/ClassSchedule');
const Course = require('../Model/course');
const User = require('../Model/user');
const {
  authenticateToken,
  requireAdmin,
  requireOwnershipOrAdmin,
} = require('../middleware/auth');

// Admin: Schedule a new class
router.post('/schedule', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      courseId,
      teacherId,
      studentIds,
      startTime,
      duration,
      meetingPlatform,
      recurrence,
      timezone,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !courseId ||
      !teacherId ||
      !startTime ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Calculate end time
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000); // Convert minutes to milliseconds

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if teacher exists and is a teacher/admin
    const teacher = await User.findById(teacherId);
    if (!teacher || !['teacher', 'admin'].includes(teacher.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID',
      });
    }

    // Check for scheduling conflicts for teacher
    const existingTeacherClass = await ClassSchedule.findOne({
      teacherId,
      startTime: { $lt: end },
      endTime: { $gt: start },
      status: { $in: ['scheduled', 'ongoing'] },
    });

    if (existingTeacherClass) {
      return res.status(409).json({
        success: false,
        message: 'Teacher has a conflicting schedule',
        conflictingClass: existingTeacherClass,
      });
    }

    // Create class schedule
    const classSchedule = new ClassSchedule({
      title,
      description,
      courseId,
      teacherId,
      studentIds: studentIds || [],
      startTime: start,
      endTime: end,
      duration,
      meetingPlatform: meetingPlatform || 'zoom',
      recurrence: recurrence || 'none',
      timezone: timezone || 'Asia/Kolkata',
      status: 'scheduled',
    });

    await classSchedule.save();

    // Trigger Zapier webhook for Zoho Calendar integration
    if (process.env.ZAPIER_WEBHOOK_URL) {
      await triggerZapierWebhook(classSchedule);
    }

    res.status(201).json({
      success: true,
      message: 'Class scheduled successfully',
      data: classSchedule,
      zapierTriggered: !!process.env.ZAPIER_WEBHOOK_URL,
    });
  } catch (error) {
    console.error('Error scheduling class:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling class',
      error: error.message,
    });
  }
});

// Trigger Zapier webhook
async function triggerZapierWebhook(classSchedule) {
  try {
    const response = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ZAPIER_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event: 'class_scheduled',
        classId: classSchedule._id,
        title: classSchedule.title,
        description: classSchedule.description,
        startTime: classSchedule.startTime.toISOString(),
        endTime: classSchedule.endTime.toISOString(),
        duration: classSchedule.duration,
        timezone: classSchedule.timezone,
        teacher: {
          id: classSchedule.teacherId,
          email: classSchedule.teacherId.email, // You might need to populate this
          name: classSchedule.teacherId.name,
        },
        course: {
          id: classSchedule.courseId,
          title: classSchedule.courseId.title,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Save Zapier webhook ID for future reference
    if (data.id) {
      classSchedule.zapierWebhookId = data.id;
      await classSchedule.save();
    }

    return data;
  } catch (error) {
    console.error('Error triggering Zapier webhook:', error);
    // Don't fail the request if Zapier webhook fails
  }
}

// Get all scheduled classes (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      status,
      teacherId,
      courseId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (teacherId) query.teacherId = teacherId;
    if (courseId) query.courseId = courseId;

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const classes = await ClassSchedule.find(query)
      .populate('teacherId', 'name email')
      .populate('courseId', 'title')
      .populate('studentIds', 'name email')
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ClassSchedule.countDocuments(query);

    res.json({
      success: true,
      data: classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message,
    });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('courseId', 'title')
      .populate('studentIds', 'name email');

    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check if user has access
    const isTeacher =
      req.user._id.toString() === classSchedule.teacherId._id.toString();
    const isStudent = classSchedule.studentIds.some(
      (student) => student._id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: classSchedule,
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class',
      error: error.message,
    });
  }
});

// Update class schedule
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id);

    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Update fields
    const updates = req.body;

    // If updating time, recalculate end time
    if (updates.startTime && updates.duration) {
      updates.endTime = new Date(
        new Date(updates.startTime).getTime() + updates.duration * 60000
      );
    }

    Object.assign(classSchedule, updates);
    classSchedule.updatedAt = new Date();

    await classSchedule.save();

    // Trigger Zapier webhook for update
    if (process.env.ZAPIER_UPDATE_WEBHOOK_URL) {
      await triggerZapierUpdateWebhook(classSchedule);
    }

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: classSchedule,
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class',
      error: error.message,
    });
  }
});

// Cancel class
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id);

    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Check permission (teacher or admin)
    const isTeacher =
      req.user._id.toString() === classSchedule.teacherId.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only teacher or admin can cancel class',
      });
    }

    classSchedule.status = 'cancelled';
    classSchedule.updatedAt = new Date();
    await classSchedule.save();

    // Trigger Zapier webhook for cancellation
    if (process.env.ZAPIER_CANCEL_WEBHOOK_URL) {
      await triggerZapierCancelWebhook(classSchedule);
    }

    res.json({
      success: true,
      message: 'Class cancelled successfully',
      data: classSchedule,
    });
  } catch (error) {
    console.error('Error cancelling class:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling class',
      error: error.message,
    });
  }
});

// Get student's upcoming classes
router.get('/student/my-classes', authenticateToken, async (req, res) => {
  try {
    const classes = await ClassSchedule.find({
      studentIds: req.user._id,
      status: { $in: ['scheduled', 'ongoing'] },
      startTime: { $gte: new Date() },
    })
      .populate('teacherId', 'name email')
      .populate('courseId', 'title')
      .sort({ startTime: 1 })
      .limit(10);

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error('Error fetching student classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message,
    });
  }
});

module.exports = router;
