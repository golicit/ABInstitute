const express = require('express');
const router = express.Router();
const Webinar = require('../Model/webinar');
const User = require('../Model/user');
const Batch = require('../Model/Batch');
const GoogleMeetService = require('../services/GoogleMeetService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all webinars/sessions (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const webinars = await Webinar.find(query)
      .populate('teacherId', 'name email')
      .populate('studentId', 'name email')
      .populate('batch', 'batchName')
      .populate('participants.userId', 'name email')
      .sort({ scheduledTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Webinar.countDocuments(query);

    res.json({
      success: true,
      data: webinars,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching webinars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webinars',
      error: error.message,
    });
  }
});

// Schedule webinar for batch
router.post(
  '/schedule-batch',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { title, description, batchId, scheduledTime, duration } = req.body;

      // Validate inputs
      if (!title || !batchId || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'Title, batch ID, and scheduled time are required',
        });
      }

      // Check if batch exists
      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found',
        });
      }

      // Get batch students
      const batchStudents = await User.find({ batch: batchId }).select(
        'email name'
      );

      // Create Google Meet
      const googleResult = await GoogleMeetService.createMeeting({
        title: `${title} - ${batch.batchName}`,
        description,
        type: 'webinar',
        startTime: new Date(scheduledTime).toISOString(),
        duration: duration || 60,
        hostEmail: req.user.email,
        participants: batchStudents.map((s) => s.email),
      });

      if (!googleResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Meet',
          error: googleResult.error,
        });
      }

      // Save to database
      const webinar = new Webinar({
        title,
        description,
        type: 'webinar',
        batch: batchId,
        teacherId: req.user._id,
        scheduledTime,
        duration: duration || 60,
        zohoMeetingId: googleResult.meetingId,
        meetingLink: googleResult.join_url,
        meetingPassword: googleResult.password,
        participants: batchStudents.map((student) => ({
          userId: student._id,
          email: student.email,
        })),
      });

      await webinar.save();

      // Send invitations via Google Meet service
      await GoogleMeetService.sendInvitations(
        googleResult.meetingId,
        batchStudents.map((s) => s.email),
        `You're invited to webinar: ${title} on ${new Date(
          scheduledTime
        ).toLocaleString()}`
      );

      res.status(201).json({
        success: true,
        message: 'Webinar scheduled successfully',
        data: webinar,
      });
    } catch (error) {
      console.error('Error scheduling webinar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule webinar',
        error: error.message,
      });
    }
  }
);

// Schedule 1:1 session for student
router.post(
  '/schedule-one-on-one',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { title, description, studentId, scheduledTime, duration } =
        req.body;

      if (!title || !scheduledTime || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'Title, student ID, and scheduled time are required',
        });
      }

      // Get student details
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      const participants = [
        {
          userId: student._id,
          email: student.email,
        },
      ];

      // Create Google Meet
      const googleResult = await GoogleMeetService.createMeeting({
        title,
        description,
        type: 'one_on_one',
        startTime: new Date(scheduledTime).toISOString(),
        duration: duration || 60,
        hostEmail: req.user.email,
        participants: participants.map((p) => p.email),
      });

      if (!googleResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Meet',
          error: googleResult.error,
        });
      }

      // Save to database
      const webinar = new Webinar({
        title,
        description,
        type: 'one_on_one',
        studentId: studentId,
        teacherId: req.user._id,
        scheduledTime,
        duration: duration || 60,
        zohoMeetingId: googleResult.meetingId,
        meetingLink: googleResult.join_url,
        meetingPassword: googleResult.password,
        participants,
      });

      await webinar.save();

      // Send invitations
      await GoogleMeetService.sendInvitations(
        googleResult.meetingId,
        participants.map((p) => p.email),
        `You're invited to 1:1 session: ${title} on ${new Date(
          scheduledTime
        ).toLocaleString()}`
      );

      res.status(201).json({
        success: true,
        message: '1:1 session scheduled successfully',
        data: webinar,
      });
    } catch (error) {
      console.error('Error scheduling 1:1 session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule 1:1 session',
        error: error.message,
      });
    }
  }
);

// Get upcoming sessions for current user
router.get('/my-sessions', authenticateToken, async (req, res) => {
  try {
    const now = new Date();

    // For admin/teacher: show all sessions they're hosting
    // For student: show sessions they're participating in
    let query = {};

    if (req.user.role === 'student') {
      query = {
        $or: [
          { studentId: req.user._id },
          { 'participants.userId': req.user._id },
        ],
        scheduledTime: { $gte: now },
        status: { $in: ['scheduled', 'live'] },
      };
    } else {
      query = {
        teacherId: req.user._id,
        scheduledTime: { $gte: now },
        status: { $in: ['scheduled', 'live'] },
      };
    }

    const sessions = await Webinar.find(query)
      .populate('teacherId', 'name email')
      .populate('studentId', 'name email')
      .populate('batch', 'batchName')
      .sort({ scheduledTime: 1 });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message,
    });
  }
});

// Start a session (get start URL for host)
router.get('/:id/start', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const webinar = await Webinar.findById(req.params.id);

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if user is the host
    if (webinar.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can start the session',
      });
    }

    // Update status to live
    webinar.status = 'live';
    await webinar.save();

    // Get meeting details from Google Meet
    const meetingDetails = await GoogleMeetService.getMeetingDetails(
      webinar.zohoMeetingId
    );

    res.json({
      success: true,
      data: {
        startUrl: meetingDetails.data?.start_url || webinar.meetingLink,
        meetingLink: webinar.meetingLink,
        status: 'live',
      },
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message,
    });
  }
});

// Join a session (get join URL for participant)
router.get('/:id/join', authenticateToken, async (req, res) => {
  try {
    const webinar = await Webinar.findById(req.params.id);

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if user can join
    const canJoin =
      webinar.teacherId.toString() === req.user._id.toString() ||
      (webinar.type === 'one_on_one' &&
        webinar.studentId?.toString() === req.user._id.toString()) ||
      webinar.participants.some(
        (p) => p.userId.toString() === req.user._id.toString()
      );

    if (!canJoin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to join this session',
      });
    }

    res.json({
      success: true,
      data: {
        meetingLink: webinar.meetingLink,
        password: webinar.meetingPassword,
        title: webinar.title,
        scheduledTime: webinar.scheduledTime,
        status: webinar.status,
      },
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join session',
      error: error.message,
    });
  }
});

// Cancel a session
router.post(
  '/:id/cancel',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const webinar = await Webinar.findById(req.params.id);

      if (!webinar) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      // Delete from Google Meet (note: Google Meet links can't be deleted via API)
      await GoogleMeetService.deleteMeeting(webinar.zohoMeetingId);

      // Update status in database
      webinar.status = 'cancelled';
      await webinar.save();

      res.json({
        success: true,
        message: 'Session cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel session',
        error: error.message,
      });
    }
  }
);

// Get webinar by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const webinar = await Webinar.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('studentId', 'name email')
      .populate('batch', 'batchName')
      .populate('participants.userId', 'name email');

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    res.json({
      success: true,
      data: webinar,
    });
  } catch (error) {
    console.error('Error fetching webinar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webinar',
      error: error.message,
    });
  }
});

// Update webinar
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, scheduledTime, duration } = req.body;

    const webinar = await Webinar.findById(req.params.id);

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    // Update fields
    if (title) webinar.title = title;
    if (description) webinar.description = description;
    if (scheduledTime) webinar.scheduledTime = scheduledTime;
    if (duration) webinar.duration = duration;

    await webinar.save();

    res.json({
      success: true,
      message: 'Webinar updated successfully',
      data: webinar,
    });
  } catch (error) {
    console.error('Error updating webinar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webinar',
      error: error.message,
    });
  }
});

// Delete webinar
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const webinar = await Webinar.findById(req.params.id);

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    // Delete from Google Meet
    await GoogleMeetService.deleteMeeting(webinar.zohoMeetingId);

    // Delete from database
    await webinar.deleteOne();

    res.json({
      success: true,
      message: 'Webinar deleted successfully',
      data: { cancelled: true },
    });
  } catch (error) {
    console.error('Error deleting webinar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webinar',
      error: error.message,
    });
  }
});

module.exports = router;
