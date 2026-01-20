// checkPassword.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testCommonPasswords(email) {
  const User = require('./Model/user');

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`\n🔍 Testing common passwords for: ${email}`);
    console.log(`Hash: ${user.passwordHash.substring(0, 30)}...`);

    // Common passwords to test
    const commonPasswords = [
      'password',
      'password123',
      '123456',
      '12345678',
      '123456789',
      'admin123',
      'test123',
      'qwerty',
      'abc123',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'sunshine',
      'master',
      'hello',
      'freedom',
      'whatever',
      'qazwsx',
      'trustno1',
      'Amitshah25@',
      'Password123',
      'Password123!',
      'Admin123',
      'Admin123!',
      'Test123',
      'Test123!',
    ];

    let found = false;

    for (const password of commonPasswords) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (isValid) {
        console.log(`✅ FOUND PASSWORD: "${password}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`❌ None of the common passwords worked`);
      console.log(`\n🔧 Options:`);
      console.log(`1. Use "Forgot Password" feature`);
      console.log(`2. Or reset manually with this script`);
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

async function resetPassword(email, newPassword) {
  const User = require('./Model/user');

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`\n🔧 Resetting password for: ${email}`);

    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ PASSWORD RESET SUCCESSFUL`);
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Please login with this password`);
  } catch (error) {
    console.error(`❌ Error resetting password:`, error);
  }
}

async function run() {
  await connectDB();

  const email = 'cifaja9980@elafans.com';

  console.log('Choose an option:');
  console.log('1. Test common passwords');
  console.log('2. Reset to a new password');
  console.log('3. Check user details');

  // For now, let's test common passwords
  await testCommonPasswords(email);

  // If that doesn't work, reset to a known password
  console.log('\n--- To reset password, run: ---');
  console.log(`await resetPassword('${email}', 'YourNewPassword123!')`);

  // Or uncomment this line to automatically reset:
  // await resetPassword(email, 'Test123!');

  mongoose.disconnect();
}

run();
