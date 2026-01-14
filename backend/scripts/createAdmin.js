const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting admin creation script...');
console.log('Current directory:', __dirname);

// Find and load .env file manually
const envPath = path.resolve(__dirname, '../.env');
console.log('Looking for .env at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  // Manually parse .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
        if (
          !key.includes('SECRET') &&
          !key.includes('KEY') &&
          !key.includes('PASS')
        ) {
          console.log(
            `   Loaded: ${key}=${value.substring(0, 20)}${
              value.length > 20 ? '...' : ''
            }`
          );
        }
      }
    }
  });
} else {
  console.log('❌ .env file NOT found');
  process.exit(1);
}

// Now load dotenv
require('dotenv').config({ path: envPath, override: true });

console.log('\n📋 Checking environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Present' : '❌ Missing');
console.log(
  'RAZORPAY_KEY_ID:',
  process.env.RAZORPAY_KEY_ID ? '✅ Present' : '❌ Missing'
);

// Use MONGO_URI instead of MONGODB_URI (your .env uses MONGO_URI)
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('\n❌ MONGO_URI is missing from .env file!');
  console.log('Your .env has MONGO_URI, not MONGODB_URI');
  process.exit(1);
}

// Import User model
let User;
try {
  User = require('../Model/user');
  console.log('✅ User model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load User model:', error.message);
  console.log(
    'Make sure Model/user.js exists at:',
    path.resolve(__dirname, '../Model/user.js')
  );
  process.exit(1);
}

const createAdmin = async () => {
  try {
    console.log('\n🔗 Connecting to MongoDB Atlas...');
    console.log('Using connection string from MONGO_URI');

    // Connect to MongoDB Atlas
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds for Atlas
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);

    const adminEmail = 'admin@abinstitute.com';
    const adminPassword = 'Admin@123';

    console.log(`\n🔍 Checking if admin exists: ${adminEmail}`);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role || 'user');
      console.log('   Name:', existingAdmin.name || 'Not set');
      console.log('   ID:', existingAdmin._id);
      console.log('\n🎉 You can login with:');
      console.log('   Email:', adminEmail);
      console.log('   Password:', adminPassword);

      // If not admin, update to admin
      if (existingAdmin.role !== 'admin') {
        console.log('\n⚠️  User exists but is not admin. Updating to admin...');
        existingAdmin.role = 'admin';
        existingAdmin.isPaidUser = true;
        existingAdmin.paymentStatus = 'paid';
        await existingAdmin.save();
        console.log('✅ User updated to admin role!');
      }
    } else {
      console.log('👤 Creating new admin user...');

      // Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        isPaidUser: true,
        paymentStatus: 'paid',
        profileCompleted: true,
        provider: 'local',
        tutoringStatus: 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await adminUser.save();

      console.log('\n✅ ADMIN USER CREATED SUCCESSFULLY!');
      console.log('========================================');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('👑 Role: admin');
      console.log('💳 Payment Status: paid');
      console.log('🆔 User ID:', adminUser._id);
      console.log('========================================');
      console.log('\n🎉 You can now login with these credentials!');
    }
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('   Message:', error.message);
    console.error('   Name:', error.name);
    console.error('   Code:', error.code);

    if (
      error.name === 'MongoNetworkError' ||
      error.name === 'MongooseServerSelectionError'
    ) {
      console.error('\n🔧 Cannot connect to MongoDB Atlas');
      console.error('Possible issues:');
      console.error('   1. Check your internet connection');
      console.error('   2. Atlas cluster might be paused');
      console.error('   3. IP might not be whitelisted in Atlas');
      console.error('   4. Connection string might be incorrect');
    } else if (error.message.includes('Authentication failed')) {
      console.error('\n🔧 Authentication failed');
      console.error('Check your username/password in MONGO_URI');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    console.log('🏁 Script finished');
  }
};

// Run the script
createAdmin();
