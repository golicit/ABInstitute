// fixDoubleHashedPasswords.js - IMPROVED VERSION
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Detect if a hash is double-hashed
async function isDoubleHashed(hash, email) {
  if (!hash || !hash.startsWith('$2')) {
    return false;
  }

  // A bcrypt hash should be exactly 60 characters
  // If it's longer, it might be double-hashed
  if (hash.length === 60) {
    // This looks like a normal bcrypt hash
    return false;
  }

  // Try to decode and check structure
  try {
    // A bcrypt hash has format: $2a$10$[22 character salt][31 character hash]
    // Total: 2 + 2 + 1 + 2 + 22 + 31 = 60 characters
    // If it's longer, it's likely double-hashed
    return hash.length > 60;
  } catch (error) {
    console.log(`⚠️ Could not analyze hash for ${email}: ${error.message}`);
    return false;
  }
}

// Fix double-hashed passwords
async function fixDoubleHashedPasswords() {
  const User = require('./Model/user');

  try {
    console.log('🔍 Finding users with passwords...');
    const users = await User.find({ passwordHash: { $ne: null } });

    console.log(`📊 Found ${users.length} users with passwords`);

    let fixedCount = 0;
    let needsResetCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n--- Checking user: ${user.email} ---`);
        console.log(`Hash length: ${user.passwordHash?.length || 0} chars`);
        console.log(`Hash preview: ${user.passwordHash?.substring(0, 30)}...`);

        const doubleHashed = await isDoubleHashed(
          user.passwordHash,
          user.email
        );

        if (doubleHashed) {
          console.log(`⚠️ DETECTED: ${user.email} has double-hashed password`);

          // Since we can't recover the original password, we need to:
          // 1. Generate a temporary password
          // 2. Hash it correctly (once)
          // 3. Mark for password reset

          const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
          console.log(`   Generated temp password: ${tempPassword}`);

          // Hash correctly (once)
          const correctHash = await bcrypt.hash(tempPassword, 12);

          // Update user
          user.passwordHash = correctHash;
          user.needsPasswordReset = true;
          user.updatedAt = new Date();
          await user.save();

          console.log(`✅ FIXED: Password reset for ${user.email}`);
          console.log(`   Please login with: ${tempPassword}`);
          console.log(`   Or use "Forgot Password" to set a new one`);

          fixedCount++;

          // Also update the user directly in MongoDB to ensure it's saved
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                passwordHash: correctHash,
                needsPasswordReset: true,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          console.log(`✓ OK: ${user.email} has normal password hash`);
        }
      } catch (error) {
        console.error(`❌ Error fixing user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ Fixed ${fixedCount} users (set temporary passwords)`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`👤 Total users checked: ${users.length}`);

    if (fixedCount > 0) {
      console.log('\n📝 TEMPORARY PASSWORDS (save these!):');
      // Re-fetch to show temp passwords
      const updatedUsers = await User.find({ needsPasswordReset: true });
      updatedUsers.forEach((user) => {
        // Note: We don't store the temp password, so we can't show it again
        console.log(`   ${user.email} - Needs password reset`);
      });
    }
  } catch (error) {
    console.error('❌ Error in fix process:', error);
  }
}

// Alternative: Manual fix for specific users
async function manualFixForUser(email, newPassword) {
  const User = require('./Model/user');

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`\n🔧 Manually fixing user: ${email}`);
    console.log(`Current hash: ${user.passwordHash?.substring(0, 30)}...`);
    console.log(`Current hash length: ${user.passwordHash?.length || 0}`);

    // Hash the new password correctly
    const correctHash = await bcrypt.hash(newPassword, 12);

    // Update user
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: correctHash,
          updatedAt: new Date(),
        },
        $unset: { needsPasswordReset: '' },
      }
    );

    console.log(`✅ MANUAL FIX COMPLETE for ${email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Please login with this password`);
  } catch (error) {
    console.error(`❌ Error in manual fix:`, error);
  }
}

// Run the fix
async function run() {
  await connectDB();

  console.log('Choose an option:');
  console.log('1. Auto-detect and fix all double-hashed passwords');
  console.log('2. Manual fix for specific user');

  // For now, run auto-fix
  await fixDoubleHashedPasswords();

  // Alternatively, manually fix the specific user you're having trouble with:
  // await manualFixForUser('cifaja9980@elafans.com', 'NewPassword123!');

  console.log('\n🎉 Password fix process completed!');
  console.log('\n⚠️ IMPORTANT NEXT STEPS:');
  console.log('1. RESTART your server after running this script');
  console.log('2. Test login with the temporary passwords shown above');
  console.log(
    '3. Users should use "Forgot Password" to set their own password'
  );
  console.log('4. New registrations will work correctly');

  mongoose.disconnect();
}

run();
