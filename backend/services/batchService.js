const Batch = require('../Model/Batch');
const User = require('../Model/user');
const mongoose = require('mongoose');

class BatchService {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.maxStudentsPerBatch = 25;
  }

  /**
   * Generate batch name in format: ABINS20262001A
   * @param {number} year - Year
   * @param {number} seriesNumber - Series number starting from 2001
   * @param {string} suffix - Letter suffix (A-Z)
   * @returns {string} Formatted batch name
   */
  generateBatchName(year, seriesNumber, suffix) {
    return `ABINS${year}${seriesNumber.toString().padStart(4, '0')}${suffix}`;
  }

  /**
   * Get the next letter in sequence (A-Z)
   * @param {string} currentLetter - Current letter
   * @returns {string} Next letter
   */
  getNextLetter(currentLetter) {
    if (!currentLetter || currentLetter === 'Z') {
      return 'A';
    }
    return String.fromCharCode(currentLetter.charCodeAt(0) + 1);
  }

  /**
   * Get current active batch (with available slots)
   * @returns {Promise<Object>} Active batch
   */
  async getCurrentActiveBatch() {
    try {
      // Find batches from current year that are not full and active
      const currentBatch = await Batch.findOne({
        year: this.currentYear,
        isActive: true,
        isFull: false,
        studentCount: { $lt: this.maxStudentsPerBatch },
      }).sort({ seriesNumber: -1, suffix: 1 });

      return currentBatch;
    } catch (error) {
      console.error('Error getting current active batch:', error);
      throw error;
    }
  }

  /**
   * Create a new batch
   * @param {number} seriesNumber - Series number
   * @param {string} suffix - Letter suffix
   * @returns {Promise<Object>} Created batch
   */
  async createNewBatch(seriesNumber, suffix) {
    try {
      const batchName = this.generateBatchName(
        this.currentYear,
        seriesNumber,
        suffix
      );
      const fullName = `Batch ${seriesNumber}${suffix} (${this.currentYear})`;

      const newBatch = await Batch.create({
        batchName: batchName,
        fullName: fullName,
        year: this.currentYear,
        seriesNumber: seriesNumber,
        suffix: suffix,
        studentCount: 0,
        isActive: true,
        isFull: false,
      });

      console.log(`✅ Created new batch: ${batchName}`);
      return newBatch;
    } catch (error) {
      console.error('Error creating new batch:', error);
      throw error;
    }
  }

  /**
   * Get or create the next available batch
   * @returns {Promise<Object>} Available batch
   */
  async getOrCreateNextBatch() {
    try {
      // Try to get current active batch
      let batch = await this.getCurrentActiveBatch();

      if (batch) {
        return batch;
      }

      // If no active batch, find the last batch to determine next series/suffix
      const lastBatch = await Batch.findOne({
        year: this.currentYear,
      }).sort({ seriesNumber: -1, suffix: -1 });

      let nextSeriesNumber = 2001;
      let nextSuffix = 'A';

      if (lastBatch) {
        if (lastBatch.suffix === 'Z') {
          // If last batch was Z, increment series number
          nextSeriesNumber = lastBatch.seriesNumber + 1;
          nextSuffix = 'A';
        } else {
          // Same series, next letter
          nextSeriesNumber = lastBatch.seriesNumber;
          nextSuffix = this.getNextLetter(lastBatch.suffix);
        }
      }

      // Create new batch
      batch = await this.createNewBatch(nextSeriesNumber, nextSuffix);
      return batch;
    } catch (error) {
      console.error('Error getting/creating next batch:', error);
      throw error;
    }
  }

  /**
   * Assign batch to a new student
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Assignment result
   */
  async assignBatchToStudent(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a batch
      if (user.batch && user.batch !== '') {
        console.log(`ℹ️ User ${user.email} already has batch: ${user.batch}`);
        return {
          success: true,
          message: 'User already has a batch',
          batchName: user.batch,
          user: user,
        };
      }

      // Get or create next available batch
      const batch = await this.getOrCreateNextBatch();

      if (!batch.canAcceptStudent()) {
        throw new Error(`Batch ${batch.batchName} is full or inactive`);
      }

      // Assign batch to user
      user.batch = batch.batchName;
      await user.save();

      // Update batch student count
      batch.studentCount += 1;
      await batch.save();

      console.log(
        `✅ Assigned ${user.email} to batch: ${batch.batchName} (${batch.studentCount}/25)`
      );

      return {
        success: true,
        message: 'Batch assigned successfully',
        batchName: batch.batchName,
        batchId: batch._id,
        studentCount: batch.studentCount,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      console.error('❌ Error assigning batch to student:', error);
      throw error;
    }
  }

  /**
   * Assign batches to all existing users without batches
   * @returns {Promise<Object>} Result of batch assignment
   */
  async assignBatchesToExistingUsers() {
    try {
      console.log('🔍 Starting batch assignment for existing users...');

      // Find all users without a batch
      const usersWithoutBatch = await User.find({
        $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
        role: { $ne: 'admin' }, // Don't assign batches to admins
      }).select('_id name email role createdAt');

      console.log(`Found ${usersWithoutBatch.length} users without batches`);

      if (usersWithoutBatch.length === 0) {
        return {
          success: true,
          message: 'All users already have batches assigned',
          totalUsers: 0,
          assignedUsers: 0,
          failedUsers: 0,
          batchesUsed: [],
        };
      }

      const results = {
        totalUsers: usersWithoutBatch.length,
        assignedUsers: 0,
        failedUsers: 0,
        batchesUsed: [],
        details: [],
      };

      // Process users in batches to avoid overwhelming the system
      const batchSize = 50;

      for (let i = 0; i < usersWithoutBatch.length; i += batchSize) {
        const userBatch = usersWithoutBatch.slice(i, i + batchSize);

        for (const user of userBatch) {
          try {
            // Skip if user already has a batch (double-check)
            const currentUser = await User.findById(user._id);
            if (currentUser.batch && currentUser.batch !== '') {
              console.log(
                `ℹ️ User ${user.email} already has batch: ${currentUser.batch}`
              );
              continue;
            }

            // Get or create next available batch
            const batch = await this.getOrCreateNextBatch();

            if (!batch.canAcceptStudent()) {
              // Create next batch if current is full
              const nextBatch = await this.getOrCreateNextBatch();
              await this.assignUserToBatch(user._id, nextBatch);
            } else {
              await this.assignUserToBatch(user._id, batch);
            }

            results.assignedUsers++;

            // Track unique batches used
            const currentUserUpdated = await User.findById(user._id);
            if (
              currentUserUpdated.batch &&
              !results.batchesUsed.includes(currentUserUpdated.batch)
            ) {
              results.batchesUsed.push(currentUserUpdated.batch);
            }

            results.details.push({
              userId: user._id,
              email: user.email,
              batch: currentUserUpdated.batch,
              status: 'success',
            });

            console.log(
              `✅ [${i + 1}/${usersWithoutBatch.length}] Assigned ${
                user.email
              } to batch`
            );

            // Small delay to prevent database overload
            if (i % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(
              `❌ Failed to assign batch to ${user.email}:`,
              error.message
            );
            results.failedUsers++;
            results.details.push({
              userId: user._id,
              email: user.email,
              error: error.message,
              status: 'failed',
            });
          }
        }
      }

      console.log(`\n🎉 Batch assignment completed!`);
      console.log(`   Total users processed: ${results.totalUsers}`);
      console.log(`   Successfully assigned: ${results.assignedUsers}`);
      console.log(`   Failed: ${results.failedUsers}`);
      console.log(`   Batches used: ${results.batchesUsed.length}`);

      return results;
    } catch (error) {
      console.error('❌ Error in batch assignment process:', error);
      throw error;
    }
  }

  /**
   * Helper method to assign user to specific batch
   */
  async assignUserToBatch(userId, batch) {
    const user = await User.findById(userId);
    user.batch = batch.batchName;
    await user.save();

    batch.studentCount += 1;
    await batch.save();
  }

  /**
   * Get batch statistics
   * @returns {Promise<Object>} Batch statistics
   */
  async getBatchStatistics() {
    try {
      const totalBatches = await Batch.countDocuments();
      const activeBatches = await Batch.countDocuments({
        isActive: true,
        isFull: false,
      });
      const fullBatches = await Batch.countDocuments({ isFull: true });

      const currentYearBatches = await Batch.find({ year: this.currentYear });
      const currentYearStats = {
        total: currentYearBatches.length,
        active: currentYearBatches.filter((b) => b.isActive && !b.isFull)
          .length,
        full: currentYearBatches.filter((b) => b.isFull).length,
        totalStudents: currentYearBatches.reduce(
          (sum, b) => sum + b.studentCount,
          0
        ),
      };

      // Get batch with most students
      const largestBatch = await Batch.findOne().sort({ studentCount: -1 });

      // Get users without batches
      const usersWithoutBatch = await User.countDocuments({
        $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
        role: { $ne: 'admin' },
      });

      return {
        overall: {
          totalBatches,
          activeBatches,
          fullBatches,
          usersWithoutBatch,
        },
        currentYear: currentYearStats,
        largestBatch: largestBatch
          ? {
              name: largestBatch.batchName,
              students: largestBatch.studentCount,
            }
          : null,
      };
    } catch (error) {
      console.error('Error getting batch statistics:', error);
      throw error;
    }
  }

  /**
   * Get all batches with details
   * @returns {Promise<Array>} List of batches
   */
  async getAllBatches() {
    try {
      const batches = await Batch.find()
        .sort({ year: -1, seriesNumber: -1, suffix: 1 })
        .select(
          'batchName fullName year seriesNumber suffix studentCount isActive isFull createdAt'
        );

      return batches;
    } catch (error) {
      console.error('Error getting all batches:', error);
      throw error;
    }
  }

  /**
   * Get batch by name
   * @param {string} batchName - Batch name
   * @returns {Promise<Object>} Batch details
   */
  async getBatchByName(batchName) {
    try {
      const batch = await Batch.findOne({ batchName });

      if (!batch) {
        throw new Error(`Batch ${batchName} not found`);
      }

      // Get students in this batch
      const students = await User.find({ batch: batchName })
        .select('name email role createdAt')
        .sort({ createdAt: 1 });

      return {
        batch,
        students: {
          count: students.length,
          list: students,
        },
      };
    } catch (error) {
      console.error(`Error getting batch ${batchName}:`, error);
      throw error;
    }
  }
}

module.exports = new BatchService();
