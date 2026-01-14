// verify-token.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { google } = require('googleapis');

async function verifyToken() {
  console.log('🔍 Verifying Google Calendar access...\n');

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  try {
    // Test 1: Get access token
    console.log('🔄 Testing token refresh...');
    const token = await auth.getAccessToken();
    console.log('✅ Access token obtained');

    // Test 2: Test Calendar API
    console.log('📅 Testing Calendar API...');
    const calendar = google.calendar({ version: 'v3', auth });

    // Create a simple test event
    const testEvent = {
      summary: 'Test Calendar Access',
      description: 'Testing if calendar API works',
      start: {
        dateTime: new Date(Date.now() + 7200000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(Date.now() + 10800000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: testEvent,
    });

    console.log('✅ Calendar API SUCCESS!');
    console.log('✅ Event created:', result.data.htmlLink);

    // Clean up
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: result.data.id,
    });
    console.log('✅ Test event cleaned up');

    return true;
  } catch (error) {
    console.log('❌ Verification FAILED:', error.message);

    if (error.response?.data) {
      console.log(
        'Error details:',
        JSON.stringify(error.response.data, null, 2)
      );
    }

    return false;
  }
}

verifyToken();
