// check-meetings-db.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function checkDatabase() {
  console.log('🔍 Checking if meetings are stored in database...\n');

  try {
    // Connect to MongoDB using your MONGO_URI from .env
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.log('❌ MONGO_URI not found in .env file');
      console.log('Check your .env file has: MONGO_URI=mongodb+srv://...');
      return;
    }

    console.log('Connecting to:', mongoUri.substring(0, 50) + '...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get the Webinar model
    const Webinar = require('./Model/webinar');

    // Count total webinars
    const totalWebinars = await Webinar.countDocuments();
    console.log(`📊 Total webinars in database: ${totalWebinars}`);

    if (totalWebinars === 0) {
      console.log('❌ NO webinars found in database!');
      console.log('This means meetings are NOT being saved.');
      return;
    }

    // Get latest 5 webinars
    const latestWebinars = await Webinar.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('\n=== LATEST WEBINARS ===\n');

    latestWebinars.forEach((webinar, index) => {
      console.log(`📅 Webinar #${index + 1}:`);
      console.log('   ID:', webinar._id);
      console.log('   Title:', webinar.title);
      console.log('   Type:', webinar.type);
      console.log(
        '   Meeting Link:',
        webinar.meetingLink || '❌ NO LINK SAVED'
      );
      console.log(
        '   Meeting Provider:',
        webinar.meetingProvider || 'Not specified'
      );
      console.log('   Scheduled Time:', webinar.scheduledTime);
      console.log('   Teacher ID:', webinar.teacherId);
      console.log('   Student ID:', webinar.studentId || 'N/A');
      console.log('   Batch ID:', webinar.batch || 'N/A');
      console.log('   Participants:', webinar.participants?.length || 0);
      console.log('   Status:', webinar.status);
      console.log('   Created:', webinar.createdAt);
      console.log('');
    });

    // Check specific fields
    console.log('=== ANALYSIS ===\n');

    const withLinks = latestWebinars.filter((w) => w.meetingLink).length;
    console.log(
      `Webinars WITH meeting links: ${withLinks}/${latestWebinars.length}`
    );

    const withGoogleMeet = latestWebinars.filter((w) =>
      w.meetingLink?.includes('meet.google.com')
    ).length;
    console.log(
      `Webinars with Google Meet links: ${withGoogleMeet}/${latestWebinars.length}`
    );

    // Check if any have the old field name
    console.log('\n=== FIELD NAMES CHECK ===');
    console.log(
      'Checking if "meet_link" field exists instead of "meetingLink"...'
    );

    // Try to find using raw collection
    const collection = mongoose.connection.db.collection('webinars');
    const sampleDoc = await collection.findOne();

    if (sampleDoc) {
      console.log('Field names in first document:');
      Object.keys(sampleDoc).forEach((key) => {
        if (key.includes('meet') || key.includes('link')) {
          console.log(`   🔍 Found: ${key} = ${sampleDoc[key]}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

// Run the check
checkDatabase();
