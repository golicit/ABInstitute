// backend/assignBatches.js
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./Model/user');
const { assignBatchToStudent } = require('./services/batchService');

async function assignBatchesToAllUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find users with null or undefined batch
    const usersWithoutBatch = await User.find({
      $or: [{ batch: { $exists: false } }, { batch: null }, { batch: '' }],
    });

    console.log(`📊 Found ${usersWithoutBatch.length} users without batch`);

    if (usersWithoutBatch.length === 0) {
      console.log('🎉 All users already have batches assigned!');
      process.exit(0);
    }

    console.log('🔄 Assigning batches...');
    let assignedCount = 0;

    for (let user of usersWithoutBatch) {
      try {
        const batchName = await assignBatchToStudent();
        user.batch = batchName;
        await user.save();
        assignedCount++;
        console.log(
          `✅ [${assignedCount}] Assigned ${batchName} to ${user.email}`
        );

        // Small delay to avoid overwhelming the batch service
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (userError) {
        console.error(
          `❌ Failed to assign batch to ${user.email}:`,
          userError.message
        );
      }
    }

    console.log('\n===================================');
    console.log(
      `🎉 COMPLETED: Assigned batches to ${assignedCount}/${usersWithoutBatch.length} users`
    );
    console.log('===================================\n');

    // Show some examples
    const updatedUsers = await User.find({ batch: { $ne: null } }).limit(5);
    console.log('Sample users with batches:');
    updatedUsers.forEach((u) => {
      console.log(`  ${u.email}: ${u.batch}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

assignBatchesToAllUsers();
