const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Webinar = require('../Model/webinar');
const User = require('../Model/user');
const Batch = require('../Model/Batch');
const GoogleMeetService = require('../services/GoogleMeetService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ========== UTILITY FUNCTIONS ==========

/**
 * Get batch information consistently
 */
async function getBatchInfo(batchIdentifier) {
  if (!batchIdentifier) {
    return { name: null, id: null, found: false };
  }

  let batchName = batchIdentifier;
  let batchId = null;
  let batchDoc = null;
  let found = false;

  // Try to find by ObjectId first
  if (mongoose.Types.ObjectId.isValid(batchIdentifier)) {
    batchDoc = await Batch.findById(batchIdentifier);
    if (batchDoc) {
      batchName = batchDoc.batchName;
      batchId = batchDoc._id;
      found = true;
      console.log(`✅ Found batch by ID: ${batchName} (${batchId})`);
    }
  }

  // If not found by ID, try by name
  if (!found) {
    batchDoc = await Batch.findOne({ batchName: batchIdentifier });
    if (batchDoc) {
      batchName = batchDoc.batchName;
      batchId = batchDoc._id;
      found = true;
      console.log(`✅ Found batch by name: ${batchName} (${batchId})`);
    }
  }

  // If still not found, use as string
  if (!found) {
    console.log(
      `⚠️ Batch "${batchIdentifier}" not found in Batch collection, using as string`
    );
  }

  return {
    name: batchName,
    id: batchId,
    doc: batchDoc,
    found: found,
    input: batchIdentifier,
  };
}

/**
 * Get students for a batch
 */
async function getBatchStudents(batchInfo) {
  const { name, id } = batchInfo;

  let query = {};

  if (id) {
    // Find users by batchReference OR batch string
    query = {
      $or: [{ batchReference: id }, { batch: name }],
    };
  } else {
    // Find users by batch string only
    query = { batch: name };
  }

  const students = await User.find(query)
    .select('email name _id batch batchReference')
    .lean();

  console.log(`👥 Found ${students.length} students for batch "${name}"`);

  return students;
}

/**
 * Build comprehensive webinar query for a user
 */
function buildUserWebinarQuery(userId, userBatch, userBatchReference) {
  console.log(`🔍 Building query for user: ${userId}`);
  console.log(`   User batch: ${userBatch || 'N/A'}`);
  console.log(`   User batch reference: ${userBatchReference || 'N/A'}`);

  const conditions = [];

  // 1. User is the student (1:1 sessions)
  conditions.push({
    type: 'one_on_one',
    studentId: userId,
    status: { $ne: 'cancelled' },
  });

  // 2. User is in participants list
  conditions.push({
    'participants.userId': userId,
    status: { $ne: 'cancelled' },
  });

  // 3. Batch webinars - multiple matching strategies
  if (userBatch) {
    // Match by batch string
    conditions.push({
      type: 'webinar',
      batch: userBatch,
      status: { $ne: 'cancelled' },
    });

    // Match by batchName
    conditions.push({
      type: 'webinar',
      batchName: userBatch,
      status: { $ne: 'cancelled' },
    });
  }

  // 4. Match by batchId if available
  if (userBatchReference) {
    conditions.push({
      type: 'webinar',
      batchId: userBatchReference,
      status: { $ne: 'cancelled' },
    });
  }

  // Remove duplicates by converting to string and back
  const uniqueConditions = Array.from(
    new Set(conditions.map((c) => JSON.stringify(c)))
  ).map((c) => JSON.parse(c));

  console.log(`📋 Built ${uniqueConditions.length} unique query conditions`);

  return uniqueConditions.length > 0 ? { $or: uniqueConditions } : {};
}

// ========== ROUTES ==========

// Get all webinars/sessions (Admin) - or filtered for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    console.log(
      `📊 Fetching webinars for: ${req.user.email} (${req.user.role})`
    );

    let query = {};

    // If user is not admin, filter their webinars
    if (!['admin', 'owner', 'teacher'].includes(req.user.role)) {
      console.log(`👤 Regular user - filtering webinars`);

      const userBatch = req.user.batch;
      const userBatchReference = req.user.batchReference;

      query = buildUserWebinarQuery(
        req.user._id,
        userBatch,
        userBatchReference
      );

      console.log(`🔎 Query for user: ${JSON.stringify(query, null, 2)}`);
    } else {
      console.log(`👑 Admin/Teacher - showing all webinars`);
    }

    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const webinars = await Webinar.find(query)
      .populate('teacherId', 'name email')
      .populate('studentId', 'name email')
      .sort({ scheduledTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Webinar.countDocuments(query);

    console.log(`✅ Found ${webinars.length} webinars`);

    // Debug logging
    webinars.forEach((webinar, index) => {
      const hasLink = webinar.meetingLink ? '✅ HAS LINK' : '❌ NO LINK';
      console.log(
        `${index + 1}. "${webinar.title}" - ${hasLink} - Type: ${
          webinar.type
        } - Batch: ${webinar.batch || 'N/A'}`
      );
    });

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
    console.error('❌ Error fetching webinars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webinars',
      error: error.message,
    });
  }
});

// Get user's webinars (optimized for dashboard)
router.get('/user/my-webinars', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userBatch = req.user.batch;
    const userBatchReference = req.user.batchReference;

    console.log(`🔍 Fetching webinars for user: ${userEmail} (ID: ${userId})`);
    console.log(`📦 User batch (string): ${userBatch || 'N/A'}`);
    console.log(`📦 User batch (reference): ${userBatchReference || 'N/A'}`);

    // Get fresh user data from database
    const userFromDB = await User.findById(userId).select(
      'batch batchReference'
    );
    const effectiveBatch = userFromDB?.batch || userBatch;
    const effectiveBatchReference =
      userFromDB?.batchReference || userBatchReference;

    console.log(`✅ Effective batch for query: ${effectiveBatch}`);
    console.log(`✅ Effective batch reference: ${effectiveBatchReference}`);

    // Build comprehensive query
    const query = buildUserWebinarQuery(
      userId,
      effectiveBatch,
      effectiveBatchReference
    );

    console.log(`🔎 Final query:`, JSON.stringify(query, null, 2));

    const webinars = await Webinar.find(query)
      .populate('teacherId', 'name email')
      .populate('studentId', 'name email')
      .sort({ scheduledTime: 1 }) // Sort ascending for dashboard (soonest first)
      .lean(); // Use lean for faster queries

    console.log(`✅ Found ${webinars.length} webinars for user ${userEmail}`);

    // Detailed debug info
    const webinarsWithDebug = webinars.map((webinar) => {
      const matchReason =
        webinar.type === 'one_on_one'
          ? '1:1 session'
          : webinar.participants.some(
              (p) => p.userId && p.userId.toString() === userId.toString()
            )
          ? 'participant list'
          : webinar.batch === effectiveBatch
          ? 'batch string match'
          : webinar.batchName === effectiveBatch
          ? 'batchName match'
          : webinar.batchId &&
            effectiveBatchReference &&
            webinar.batchId.toString() === effectiveBatchReference.toString()
          ? 'batchId match'
          : 'unknown';

      return {
        ...webinar,
        _matchReason: matchReason,
        _hasMeetingLink: !!webinar.meetingLink,
      };
    });

    // Log each webinar
    webinarsWithDebug.forEach((webinar, index) => {
      console.log(`\n--- Webinar ${index + 1} ---`);
      console.log(`Title: ${webinar.title}`);
      console.log(`Type: ${webinar.type}`);
      console.log(`Match Reason: ${webinar._matchReason}`);
      console.log(
        `Meeting Link: ${webinar.meetingLink ? '✅ PRESENT' : '❌ MISSING'}`
      );
      console.log(`Batch: ${webinar.batch || 'N/A'}`);
      console.log(`Batch Name: ${webinar.batchName || 'N/A'}`);
      console.log(`Batch ID: ${webinar.batchId || 'N/A'}`);
    });

    res.json({
      success: true,
      data: webinarsWithDebug.map((w) => {
        // Remove debug fields from response
        const { _matchReason, _hasMeetingLink, ...cleanWebinar } = w;
        return cleanWebinar;
      }),
      count: webinars.length,
      userInfo: {
        userId,
        email: userEmail,
        batch: effectiveBatch,
        batchReference: effectiveBatchReference,
      },
      debug: {
        queryConditions: query.$or?.length || 0,
        matches: webinarsWithDebug.map((w) => ({
          title: w.title,
          type: w.type,
          matchReason: w._matchReason,
          hasLink: w._hasMeetingLink,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching user webinars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webinars',
      error: error.message,
    });
  }
});

// Schedule webinar for batch (FIXED VERSION)
router.post(
  '/schedule-batch',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { title, description, batchId, scheduledTime, duration } = req.body;

      console.log(`\n📅 ========== SCHEDULING BATCH WEBINAR ==========`);
      console.log(`📝 Title: ${title}`);
      console.log(`📝 Batch Identifier: ${batchId}`);
      console.log(`📝 Scheduled Time: ${scheduledTime}`);

      // Validate inputs
      if (!title || !batchId || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'Title, batch ID, and scheduled time are required',
        });
      }

      // Get batch information consistently
      const batchInfo = await getBatchInfo(batchId);
      console.log(
        `✅ Resolved batch: "${batchInfo.name}" (ID: ${batchInfo.id || 'N/A'})`
      );

      // Get students for this batch
      const batchStudents = await getBatchStudents(batchInfo);

      if (batchStudents.length === 0) {
        console.warn(`⚠️ No students found for batch "${batchInfo.name}"`);
      }

      // Create Google Meet
      const googleResult = await GoogleMeetService.createMeeting({
        title: `${title} - ${batchInfo.name}`,
        description,
        type: 'webinar',
        startTime: new Date(scheduledTime).toISOString(),
        duration: duration || 60,
        hostEmail: req.user.email,
        participants: batchStudents.map((s) => s.email),
      });

      if (!googleResult.success) {
        console.error('❌ Failed to create Google Meet:', googleResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Meet',
          error: googleResult.error,
        });
      }

      console.log(`✅ Google Meet created successfully`);
      console.log(`   Meeting ID: ${googleResult.meetingId}`);
      console.log(`   Join URL: ${googleResult.join_url}`);

      // Create participants array with batch info
      const participants = await Promise.all(
        batchStudents.map(async (student) => {
          return {
            userId: student._id,
            email: student.email,
            name: student.name,
            joined: false,
            userBatch: student.batch,
            userBatchReference: student.batchReference,
          };
        })
      );

      // Create webinar with CONSISTENT data
      const webinar = new Webinar({
        title,
        description: description || '',
        type: 'webinar',

        // Store batch info in three ways for maximum compatibility
        batch: batchInfo.name, // String (primary for queries)
        batchName: batchInfo.name, // String (explicit)
        batchId: batchInfo.id, // ObjectId (reference)

        teacherId: req.user._id,
        scheduledTime,
        duration: duration || 60,
        meetingProvider: 'google_meet',
        meetingId: googleResult.meetingId,
        meetingLink: googleResult.join_url,
        meetingPassword: googleResult.password,
        participants,

        // Metadata for debugging and tracking
        metadata: {
          createdVia: 'schedule-batch',
          batchSource: batchInfo.found ? 'batch_collection' : 'custom_string',
          batchInputType: typeof batchId,
          originalBatchInput: batchId,
          participantCount: participants.length,
          googleMeetCreated: true,
          invitationsSent: false,
        },

        analytics: {
          totalInvited: participants.length,
          totalJoined: 0,
        },
      });

      await webinar.save();

      console.log(`💾 Webinar saved to database`);
      console.log(`   Webinar ID: ${webinar._id}`);
      console.log(`   Batch stored as: "${webinar.batch}"`);
      console.log(`   Participants: ${participants.length}`);

      // Log sample participants
      participants.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.email} (Batch: ${p.userBatch || 'N/A'})`);
      });
      if (participants.length > 3) {
        console.log(`   ... and ${participants.length - 3} more`);
      }

      // Send invitations
      try {
        if (batchStudents.length > 0) {
          await GoogleMeetService.sendInvitations(
            googleResult.meetingId,
            batchStudents.map((s) => s.email),
            `You're invited to webinar: ${title} on ${new Date(
              scheduledTime
            ).toLocaleString()}`
          );
          webinar.metadata.invitationsSent = true;
          await webinar.save();
          console.log(
            `📧 Invitations sent to ${batchStudents.length} students`
          );
        }
      } catch (inviteError) {
        console.error('⚠️ Failed to send invitations:', inviteError);
        // Don't fail the request
      }

      console.log(`🎉 Webinar scheduled successfully!\n`);

      res.status(201).json({
        success: true,
        message: 'Webinar scheduled successfully',
        data: webinar,
        debug: {
          batch: {
            resolvedName: webinar.batch,
            storedAs: webinar.batch,
            storedName: webinar.batchName,
            storedId: webinar.batchId,
          },
          meeting: {
            hasLink: !!webinar.meetingLink,
            link: webinar.meetingLink,
            id: webinar.meetingId,
          },
          participants: {
            count: participants.length,
            sample: participants.slice(0, 3).map((p) => p.email),
          },
        },
      });
    } catch (error) {
      console.error('❌ Error scheduling webinar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule webinar',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

      console.log(`\n📅 ========== SCHEDULING 1:1 SESSION ==========`);
      console.log(`📝 Title: ${title}`);
      console.log(`📝 Student ID: ${studentId}`);
      console.log(`📝 Scheduled Time: ${scheduledTime}`);

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

      console.log(`👤 Student: ${student.name} (${student.email})`);
      console.log(`📦 Student batch: ${student.batch || 'No batch'}`);

      // Create Google Meet
      const googleResult = await GoogleMeetService.createMeeting({
        title: `1:1 Session: ${title} - ${student.name}`,
        description,
        type: 'one_on_one',
        startTime: new Date(scheduledTime).toISOString(),
        duration: duration || 60,
        hostEmail: req.user.email,
        participants: [student.email, req.user.email],
      });

      if (!googleResult.success) {
        console.error('❌ Failed to create Google Meet:', googleResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create Google Meet',
          error: googleResult.error,
        });
      }

      console.log(`✅ Google Meet created successfully`);
      console.log(`   Meeting ID: ${googleResult.meetingId}`);
      console.log(`   Join URL: ${googleResult.join_url}`);

      // Save to database
      const webinar = new Webinar({
        title,
        description: description || '',
        type: 'one_on_one',
        studentId: studentId,
        teacherId: req.user._id,
        scheduledTime,
        duration: duration || 60,
        meetingProvider: 'google_meet',
        meetingId: googleResult.meetingId,
        meetingLink: googleResult.join_url,
        meetingPassword: googleResult.password,
        participants: [
          {
            userId: student._id,
            email: student.email,
            name: student.name,
            joined: false,
            userBatch: student.batch,
            userBatchReference: student.batchReference,
          },
          {
            userId: req.user._id,
            email: req.user.email,
            name: req.user.name,
            joined: false,
            userBatch: req.user.batch,
            userBatchReference: req.user.batchReference,
          },
        ],
        metadata: {
          createdVia: 'schedule-one-on-one',
          participantCount: 2,
          googleMeetCreated: true,
          invitationsSent: false,
        },
      });

      await webinar.save();

      console.log(`💾 1:1 session saved to database with ID: ${webinar._id}`);
      console.log(`🤝 Participants: ${student.name} & ${req.user.name}`);

      // Send invitation
      try {
        await GoogleMeetService.sendInvitations(
          googleResult.meetingId,
          [student.email],
          `You're invited to 1:1 session: ${title} on ${new Date(
            scheduledTime
          ).toLocaleString()}`
        );
        webinar.metadata.invitationsSent = true;
        await webinar.save();
        console.log(`📧 Invitation sent to student`);
      } catch (inviteError) {
        console.error('⚠️ Failed to send invitation:', inviteError);
      }

      console.log(`🎉 1:1 session scheduled successfully!\n`);

      res.status(201).json({
        success: true,
        message: '1:1 session scheduled successfully',
        data: webinar,
        debug: {
          meeting: {
            hasLink: !!webinar.meetingLink,
            link: webinar.meetingLink,
            id: webinar.meetingId,
          },
        },
      });
    } catch (error) {
      console.error('❌ Error scheduling 1:1 session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule 1:1 session',
        error: error.message,
      });
    }
  }
);

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
      webinar.meetingId
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
    const canJoin = webinar.canUserAccess(req.user._id, req.user.batch);

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

      // Update status in database
      webinar.status = 'cancelled';
      await webinar.save();

      res.json({
        success: true,
        message: 'Session cancelled successfully',
        data: { cancelled: true },
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
      .populate('batchId', 'batchName')
      .populate('participants.userId', 'name email batch batchReference');

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

// DEBUG: Check all webinars in database
router.get(
  '/debug/all-webinars',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const webinars = await Webinar.find({})
        .populate('teacherId', 'name email')
        .populate('studentId', 'name email')
        .populate('batchId', 'batchName')
        .sort({ createdAt: -1 });

      console.log(`📊 Total webinars in database: ${webinars.length}`);

      const batchWebinars = webinars.filter((w) => w.type === 'webinar');
      const oneOnOneWebinars = webinars.filter((w) => w.type === 'one_on_one');

      console.log(`📋 Batch webinars: ${batchWebinars.length}`);
      console.log(`🤝 1:1 sessions: ${oneOnOneWebinars.length}`);

      // Detailed logging
      console.log('\n📝 BATCH WEBINARS:');
      batchWebinars.forEach((w, i) => {
        console.log(`\n--- Batch Webinar ${i + 1} ---`);
        console.log(`   ID: ${w._id}`);
        console.log(`   Title: ${w.title}`);
        console.log(`   Batch: ${w.batch}`);
        console.log(`   Batch Name: ${w.batchName}`);
        console.log(`   Batch ID: ${w.batchId}`);
        console.log(`   Teacher: ${w.teacherId?.name}`);
        console.log(`   Scheduled: ${w.scheduledTime}`);
        console.log(`   Status: ${w.status}`);
        console.log(`   Meeting Link: ${w.meetingLink || 'NO LINK'}`);
        console.log(`   Participants: ${w.participants?.length || 0}`);
      });

      console.log('\n📝 1:1 SESSIONS:');
      oneOnOneWebinars.forEach((w, i) => {
        console.log(`\n--- 1:1 Session ${i + 1} ---`);
        console.log(`   ID: ${w._id}`);
        console.log(`   Title: ${w.title}`);
        console.log(`   Student: ${w.studentId?.name} (${w.studentId?.email})`);
        console.log(`   Teacher: ${w.teacherId?.name}`);
        console.log(`   Scheduled: ${w.scheduledTime}`);
        console.log(`   Status: ${w.status}`);
        console.log(`   Meeting Link: ${w.meetingLink || 'NO LINK'}`);
        console.log(`   Participants: ${w.participants?.length || 0}`);
      });

      res.json({
        success: true,
        total: webinars.length,
        batchWebinars: batchWebinars.length,
        oneOnOneWebinars: oneOnOneWebinars.length,
        allWebinars: webinars.map((w) => ({
          _id: w._id,
          title: w.title,
          type: w.type,
          batch: w.batch,
          batchName: w.batchName,
          batchId: w.batchId,
          studentId: w.studentId,
          teacherId: w.teacherId,
          meetingLink: w.meetingLink,
          scheduledTime: w.scheduledTime,
          status: w.status,
          participantsCount: w.participants?.length || 0,
        })),
      });
    } catch (error) {
      console.error('❌ Error fetching all webinars:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch webinars',
        error: error.message,
      });
    }
  }
);

// DEBUG: Check user's access to webinars
router.get(
  '/debug/user-access/:userId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId).select(
        'name email batch batchReference'
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      console.log(`\n🔍 DEBUG USER ACCESS FOR: ${user.name} (${user.email})`);
      console.log(`📦 Batch: ${user.batch}`);
      console.log(`📦 Batch Reference: ${user.batchReference}`);

      // Build query
      const query = buildUserWebinarQuery(
        userId,
        user.batch,
        user.batchReference
      );

      const webinars = await Webinar.find(query)
        .select(
          'title type batch batchName batchId meetingLink scheduledTime status participants'
        )
        .populate('teacherId', 'name email')
        .populate('studentId', 'name email')
        .sort({ scheduledTime: 1 });

      console.log(`\n✅ User should see ${webinars.length} webinars:`);

      webinars.forEach((w, i) => {
        const matchReason =
          w.type === 'one_on_one'
            ? '1:1 session'
            : w.participants.some((p) => p.userId.toString() === userId)
            ? 'participant list'
            : w.batch === user.batch
            ? 'batch string match'
            : w.batchName === user.batch
            ? 'batchName match'
            : w.batchId &&
              user.batchReference &&
              w.batchId.toString() === user.batchReference.toString()
            ? 'batchId match'
            : 'unknown';

        console.log(`\n--- Webinar ${i + 1} ---`);
        console.log(`   Title: ${w.title}`);
        console.log(`   Type: ${w.type}`);
        console.log(`   Match Reason: ${matchReason}`);
        console.log(
          `   Meeting Link: ${w.meetingLink ? '✅ PRESENT' : '❌ MISSING'}`
        );
        console.log(`   Batch: ${w.batch || 'N/A'}`);
        console.log(`   Batch Name: ${w.batchName || 'N/A'}`);
        console.log(`   Batch ID: ${w.batchId || 'N/A'}`);
      });

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          batch: user.batch,
          batchReference: user.batchReference,
        },
        webinars: webinars,
        count: webinars.length,
        query: query,
      });
    } catch (error) {
      console.error('❌ Error checking user access:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check user access',
        error: error.message,
      });
    }
  }
);

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

    // Delete from database
    await webinar.deleteOne();

    res.json({
      success: true,
      message: 'Webinar deleted successfully',
      data: { deleted: true },
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
