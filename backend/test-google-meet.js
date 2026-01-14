// test-google-meet-fixed.js
const path = require('path');

// 🔥 CRITICAL: Load .env file from the correct location
const envPath = path.join(__dirname, '.env');
console.log('📁 Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

// Verify environment variables are loaded
console.log('\n🔍 Environment Variables Check:');
console.log(
  'GOOGLE_CLIENT_ID:',
  process.env.GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Missing'
);
console.log(
  'GOOGLE_REFRESH_TOKEN:',
  process.env.GOOGLE_REFRESH_TOKEN ? '✅ Loaded' : '❌ Missing'
);

if (!process.env.GOOGLE_REFRESH_TOKEN) {
  console.log('\n❌ Refresh token not loaded!');
  console.log('Check if .env file exists at:', envPath);
  console.log('File exists?', require('fs').existsSync(envPath));
  process.exit(1);
}

async function testGoogleMeet() {
  try {
    console.log('\n🧪 Testing Google Meet creation...');

    // Import the service
    const GoogleMeetService = require('./services/GoogleMeetService');

    console.log('✅ Service loaded');
    console.log(
      '✅ Has createMeeting?',
      typeof GoogleMeetService.createMeeting === 'function'
    );

    // Test data
    const testMeeting = {
      title: 'Test Meeting - Real Google Meet',
      description: 'Testing real Google Meet integration',
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      duration: 30,
      participants: ['resources.golicit@gmail.com'], // Use your email
      type: 'webinar',
      hostEmail: 'resources.golicit@gmail.com',
    };

    console.log('\n📅 Creating meeting:', testMeeting.title);
    console.log('⏰ Time:', new Date(testMeeting.startTime).toLocaleString());

    // Create meeting
    const result = await GoogleMeetService.createMeeting(testMeeting);

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Provider:', result.provider);
    console.log('Meeting Link:', result.join_url);

    if (result.success && result.provider === 'google_calendar') {
      console.log('\n🎉 REAL Google Meet created via Calendar API!');
      console.log('📧 Email invites sent automatically');
      console.log('📅 Calendar Event:', result.calendarLink);

      // Test the link
      console.log('\n🔗 Testing the Google Meet link...');
      console.log('1. The link should work immediately');
      console.log('2. Check your email for calendar invite');
      console.log('3. The meeting is scheduled in your Google Calendar');
    } else if (result.success) {
      console.log('\n⚠️ Using generated link (fallback method)');
      console.log('💡 Check if this link works:', result.join_url);
      console.log(
        '   If not, the refresh token might not have correct permissions'
      );
    } else {
      console.log('\n❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testGoogleMeet();
