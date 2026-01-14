// routes/batches.js
const express = require('express');
const router = express.Router();
const Batch = require('../Model/Batch');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all batches (for admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const batches = await Batch.find().sort({ batchName: 1 });

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: error.message,
    });
  }
});

// Get batch by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message,
    });
  }
});

module.exports = router;
