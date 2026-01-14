const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const batchService = require('../services/batchService');
const User = require('../Model/user');

/**
 * @route   POST /api/admin/batches/assign-existing
 * @desc    Assign batches to all existing users without batches
 * @access  Admin only
 */
router.post(
  '/assign-existing',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log('🔄 Admin requested batch assignment for existing users');

      const result = await batchService.assignBatchesToExistingUsers();

      res.json({
        success: true,
        message: 'Batch assignment completed',
        ...result,
      });
    } catch (error) {
      console.error('Error in batch assignment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign batches',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/admin/batches/assign-user
 * @desc    Manually assign batch to specific user
 * @access  Admin only
 */
router.post(
  '/assign-user',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await batchService.assignBatchToStudent(userId);

      res.json({
        success: true,
        message: 'Batch assigned successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error assigning batch to user:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign batch',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/admin/batches/statistics
 * @desc    Get batch statistics
 * @access  Admin only
 */
router.get('/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await batchService.getBatchStatistics();

    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('Error getting batch statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/admin/batches/all
 * @desc    Get all batches with details
 * @access  Admin only
 */
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const batches = await batchService.getAllBatches();

    res.json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error('Error getting all batches:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get batches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/admin/batches/:batchName
 * @desc    Get batch details by name
 * @access  Admin only
 */
router.get('/:batchName', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { batchName } = req.params;

    const batchDetails = await batchService.getBatchByName(batchName);

    res.json({
      success: true,
      ...batchDetails,
    });
  } catch (error) {
    console.error('Error getting batch details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get batch details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/admin/batches/users/without-batch
 * @desc    Get users without batches
 * @access  Admin only
 */
router.get(
  '/users/without-batch',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { limit = 50, page = 1 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find({
        $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
        role: { $ne: 'admin' },
      })
        .select('name email role createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: 1 });

      const total = await User.countDocuments({
        $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
        role: { $ne: 'admin' },
      });

      res.json({
        success: true,
        count: users.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        users,
      });
    } catch (error) {
      console.error('Error getting users without batch:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get users',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/admin/batches/create-manual
 * @desc    Create a batch manually (for testing/emergencies)
 * @access  Admin only
 */
router.post(
  '/create-manual',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { seriesNumber, suffix } = req.body;

      if (!seriesNumber || !suffix) {
        return res.status(400).json({
          success: false,
          message: 'Series number and suffix are required',
        });
      }

      const batch = await batchService.createNewBatch(
        parseInt(seriesNumber),
        suffix.toUpperCase()
      );

      res.json({
        success: true,
        message: 'Batch created successfully',
        batch,
      });
    } catch (error) {
      console.error('Error creating manual batch:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create batch',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
