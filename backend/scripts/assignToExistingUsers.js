#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Manually load .env file
const loadEnvFile = () => {
  const envPath = path.resolve(__dirname, '../.env');
  console.log('Looking for .env at:', envPath);

  if (fs.existsSync(envPath)) {
    console.log('✅ Found .env file');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    let loadedCount = 0;
    lines.forEach((line) => {
      line = line.trim();
      // Skip comments and empty lines
      if (line && !line.startsWith('#')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
          process.env[key] = cleanValue;
          loadedCount++;
        }
      }
    });
    console.log(`Loaded ${loadedCount} variables from .env`);
    return true;
  } else {
    console.log('❌ .env file not found at:', envPath);
    return false;
  }
};

// Load models
const User = require('../Model/user');
const Batch = require('../Model/Batch');

// Batch assignment logic - FIXED VERSION
class BatchAssignment {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.maxStudentsPerBatch = 25;
    this.currentBatch = null; // Track current batch
  }

  generateBatchName(year, seriesNumber, suffix) {
    return `ABINS${year}${seriesNumber.toString().padStart(4, '0')}${suffix}`;
  }

  getNextLetter(currentLetter) {
    if (!currentLetter || currentLetter === 'Z') {
      return 'A';
    }
    return String.fromCharCode(currentLetter.charCodeAt(0) + 1);
  }

  async getOrCreateNextBatch() {
    // If we already have a current batch with space, use it
    if (
      this.currentBatch &&
      this.currentBatch.studentCount < this.maxStudentsPerBatch &&
      this.currentBatch.isActive
    ) {
      return this.currentBatch;
    }

    // Try to find an existing batch with space
    let batch = await Batch.findOne({
      year: this.currentYear,
      isActive: true,
      isFull: false,
      studentCount: { $lt: this.maxStudentsPerBatch },
    }).sort({ seriesNumber: 1, suffix: 1 });

    if (batch) {
      this.currentBatch = batch;
      return batch;
    }

    // If no batch with space exists, create a new one
    const lastBatch = await Batch.findOne({
      year: this.currentYear,
    }).sort({ seriesNumber: -1, suffix: -1 });

    let nextSeriesNumber = 2001;
    let nextSuffix = 'A';

    if (lastBatch) {
      if (lastBatch.studentCount >= this.maxStudentsPerBatch) {
        // Last batch is full, need next letter or next series
        if (lastBatch.suffix === 'Z') {
          nextSeriesNumber = lastBatch.seriesNumber + 1;
          nextSuffix = 'A';
        } else {
          nextSeriesNumber = lastBatch.seriesNumber;
          nextSuffix = this.getNextLetter(lastBatch.suffix);
        }
      } else {
        // Last batch has space, use it
        this.currentBatch = lastBatch;
        return lastBatch;
      }
    }

    // Create new batch
    const batchName = this.generateBatchName(
      this.currentYear,
      nextSeriesNumber,
      nextSuffix
    );
    const fullName = `Batch ${nextSeriesNumber}${nextSuffix} (${this.currentYear})`;

    batch = await Batch.create({
      batchName: batchName,
      fullName: fullName,
      year: this.currentYear,
      seriesNumber: nextSeriesNumber,
      suffix: nextSuffix,
      studentCount: 0,
      isActive: true,
      isFull: false,
    });

    console.log(`✅ Created new batch: ${batchName}`);
    this.currentBatch = batch;
    return batch;
  }

  async assignBatchesToExistingUsers() {
    console.log('🔍 Starting batch assignment for existing users...');

    // Find all users without a batch
    const usersWithoutBatch = await User.find({
      $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
      role: { $ne: 'admin' },
    }).select('_id name email role createdAt');

    console.log(`Found ${usersWithoutBatch.length} users without batches`);

    if (usersWithoutBatch.length === 0) {
      console.log('✅ All users already have batches assigned');
      return {
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
      batchesUsed: new Set(),
      details: [],
    };

    console.log(`\nProcessing ${usersWithoutBatch.length} users...`);

    // Reset current batch tracker
    this.currentBatch = null;

    for (let i = 0; i < usersWithoutBatch.length; i++) {
      const user = usersWithoutBatch[i];

      try {
        // Double-check user doesn't have batch
        const currentUser = await User.findById(user._id);
        if (currentUser.batch && currentUser.batch !== '') {
          console.log(
            `ℹ️  Skipping ${user.email} - already has batch: ${currentUser.batch}`
          );
          continue;
        }

        // Get or create batch
        const batch = await this.getOrCreateNextBatch();

        // Assign user to batch
        await this.assignUserToBatch(user._id, batch);
        results.batchesUsed.add(batch.batchName);
        results.assignedUsers++;

        // Show progress
        if ((i + 1) % 5 === 0 || i === usersWithoutBatch.length - 1) {
          console.log(
            `   Processed ${i + 1}/${
              usersWithoutBatch.length
            } users - Current batch: ${batch.batchName} (${
              batch.studentCount
            }/25)`
          );
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
        });
      }
    }

    return results;
  }

  async assignUserToBatch(userId, batch) {
    const user = await User.findById(userId);
    user.batch = batch.batchName;
    await user.save();

    batch.studentCount += 1;

    // Mark as full if reached capacity
    if (batch.studentCount >= this.maxStudentsPerBatch) {
      batch.isFull = true;
    }

    await batch.save();
  }
}

const assignToExistingUsers = async () => {
  try {
    console.log('🚀 Starting batch assignment for existing users...');

    // Load environment variables manually
    if (!loadEnvFile()) {
      process.exit(1);
    }

    // Get MongoDB URI from environment
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas');

    // First, let's clear existing batch assignments to start fresh
    console.log('\n🧹 Clearing existing batch assignments for testing...');
    await User.updateMany(
      {
        $or: [
          { batch: { $exists: true, $ne: null, $ne: '' } },
          { batch: { $regex: /^ABINS/ } },
        ],
      },
      { $set: { batch: '' } }
    );

    // Also reset batch student counts
    await Batch.updateMany({}, { $set: { studentCount: 0, isFull: false } });

    console.log('✅ Cleared existing assignments');

    // Delete all batches except A
    await Batch.deleteMany({
      batchName: { $ne: 'ABINS20262001A' },
    });
    console.log(`🗑️  Deleted extra batches, keeping only ABINS20262001A`);

    // Run assignment
    const assignmentService = new BatchAssignment();
    const result = await assignmentService.assignBatchesToExistingUsers();

    console.log('\n🎉 Assignment Results:');
    console.log(`   Total users processed: ${result.totalUsers}`);
    console.log(`   Successfully assigned: ${result.assignedUsers}`);
    console.log(`   Failed: ${result.failedUsers}`);

    if (result.batchesUsed.size > 0) {
      console.log(`\n📋 Batch Details:`);
      const batchArray = Array.from(result.batchesUsed);
      for (const batchName of batchArray) {
        const batch = await Batch.findOne({ batchName });
        const studentsInBatch = await User.countDocuments({ batch: batchName });
        console.log(`   ${batchName}: ${studentsInBatch}/25 students`);
      }

      console.log(`\n   Total batches used: ${batchArray.length}`);
      console.log(
        `   Expected batches for 15 students: ${Math.ceil(15 / 25)} = 1 batch`
      );
    }

    // Show overall statistics
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const usersWithBatch = await User.countDocuments({
      batch: { $ne: null, $ne: '' },
      role: { $ne: 'admin' },
    });

    console.log('\n📊 Overall Statistics:');
    console.log(`   Total users in system: ${totalUsers}`);
    console.log(`   Users with batches: ${usersWithBatch}`);
    console.log(`   Users without batches: ${totalUsers - usersWithBatch}`);

    console.log('\n✅ Batch assignment completed!');

    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Failed:', error.message);

    if (error.name === 'MongoServerSelectionError') {
      console.log('\n🔴 Check your MongoDB Atlas connection');
    }

    process.exit(1);
  }
};

// Run the assignment
assignToExistingUsers();
