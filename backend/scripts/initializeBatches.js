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
const Batch = require('../Model/Batch');

// Create a simple batch service for initialization
class SimpleBatchService {
  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  generateBatchName(year, seriesNumber, suffix) {
    return `ABINS${year}${seriesNumber.toString().padStart(4, '0')}${suffix}`;
  }

  async createNewBatch(seriesNumber, suffix) {
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

    return newBatch;
  }

  async getBatchStatistics() {
    const totalBatches = await Batch.countDocuments();
    const activeBatches = await Batch.countDocuments({
      isActive: true,
      isFull: false,
    });
    const fullBatches = await Batch.countDocuments({ isFull: true });

    const currentYearBatches = await Batch.find({ year: this.currentYear });
    const currentYearStats = {
      total: currentYearBatches.length,
      active: currentYearBatches.filter((b) => b.isActive && !b.isFull).length,
      full: currentYearBatches.filter((b) => b.isFull).length,
      totalStudents: currentYearBatches.reduce(
        (sum, b) => sum + b.studentCount,
        0
      ),
    };

    return {
      overall: {
        totalBatches,
        activeBatches,
        fullBatches,
      },
      currentYear: currentYearStats,
    };
  }
}

const initializeBatches = async () => {
  try {
    console.log('🚀 Starting batch system initialization...');
    console.log('Current directory:', __dirname);

    // Load environment variables manually
    if (!loadEnvFile()) {
      process.exit(1);
    }

    // Get MongoDB URI from environment
    const mongoURI = process.env.MONGO_URI;

    console.log('\nChecking environment variables:');
    console.log('MONGO_URI exists:', !!mongoURI);
    console.log(
      'MONGO_URI value:',
      mongoURI ? mongoURI.substring(0, 50) + '...' : 'Not found'
    );

    if (!mongoURI) {
      console.error('❌ MONGO_URI not found in environment variables');
      console.log('\nAvailable environment variables with "MONGO" or "URI":');
      Object.keys(process.env).forEach((key) => {
        if (key.includes('MONGO') || key.includes('URI')) {
          console.log(`  ${key}=${process.env[key]}`);
        }
      });
      process.exit(1);
    }

    console.log('\nConnecting to MongoDB Atlas...');

    // Connect to MongoDB Atlas
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas');

    // Check if any batches exist
    const existingBatches = await Batch.countDocuments();
    console.log(`Existing batches in system: ${existingBatches}`);

    const batchService = new SimpleBatchService();

    if (existingBatches === 0) {
      console.log('📦 No batches found. Creating initial batch...');

      const initialBatch = await batchService.createNewBatch(2001, 'A');

      console.log(`\n✅ Created initial batch:`);
      console.log(`   Batch Name: ${initialBatch.batchName}`);
      console.log(`   Full Name: ${initialBatch.fullName}`);
      console.log(`   Year: ${initialBatch.year}`);
      console.log(`   Series: ${initialBatch.seriesNumber}`);
      console.log(`   Suffix: ${initialBatch.suffix}`);
      console.log(`   Students: ${initialBatch.studentCount}/25`);
    } else {
      console.log('ℹ️  Batches already exist in the system:');
      const batches = await Batch.find().sort({ createdAt: 1 });
      batches.forEach((batch, index) => {
        console.log(
          `${index + 1}. ${batch.batchName} - ${batch.studentCount}/25 students`
        );
      });
    }

    // Get batch statistics
    const stats = await batchService.getBatchStatistics();
    console.log('\n📊 Batch Statistics:');
    console.log(`   Total Batches: ${stats.overall.totalBatches}`);
    console.log(`   Active Batches: ${stats.overall.activeBatches}`);
    console.log(`   Full Batches: ${stats.overall.fullBatches}`);

    console.log('\n✅ Batch system initialization completed!');

    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);

    if (error.name === 'MongoServerSelectionError') {
      console.log('\n🔴 MongoDB Connection Error!');
    }

    process.exit(1);
  }
};

// Run the initialization
initializeBatches();
