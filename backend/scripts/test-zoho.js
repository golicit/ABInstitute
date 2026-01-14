const ZohoMeetingService = require('../services/ZohoMeetingService');

async function testZohoConnection() {
  console.log('🧪 Testing Zoho Meeting API Connection...\n');

  try {
    // 1. Test token refresh
    console.log('1. Testing token refresh...');
    const token = await ZohoMeetingService.getAccessToken();
    console.log(
      '✅ Access token obtained:',
      token ? 'Yes (length: ' + token.length + ')' : 'No'
    );

    // 2. Test creating a meeting
    console.log('\n2. Testing meeting creation...');
    const testMeeting = await ZohoMeetingService.createMeeting({
      title: 'Test Meeting - AB Institute',
      description: 'This is a test meeting for Zoho API integration',
      type: 'one_on_one',
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      duration: 30,
      hostEmail: process.env.ZOHO_EMAIL || 'admin@abinstitute.co.in',
      participants: [process.env.ZOHO_EMAIL || 'admin@abinstitute.co.in'],
    });

    if (testMeeting.success) {
      console.log('✅ Meeting created successfully!');
      console.log('   Meeting ID:', testMeeting.meetingId);
      console.log('   Join URL:', testMeeting.join_url);
      console.log('   Start URL:', testMeeting.start_url);

      // 3. Test sending invitations
      console.log('\n3. Testing invitation sending...');
      const inviteResult = await ZohoMeetingService.sendInvitations(
        testMeeting.meetingId,
        [process.env.ZOHO_EMAIL || 'admin@abinstitute.co.in'],
        'Test invitation for Zoho API'
      );

      if (inviteResult.success) {
        console.log('✅ Invitation sent successfully!');
      } else {
        console.log('⚠️ Invitation failed:', inviteResult.error);
      }

      // 4. Test getting meeting details
      console.log('\n4. Testing meeting details retrieval...');
      const details = await ZohoMeetingService.getMeetingDetails(
        testMeeting.meetingId
      );

      if (details.success) {
        console.log('✅ Meeting details retrieved!');
        console.log('   Topic:', details.data.topic);
        console.log('   Status:', details.data.status);
      } else {
        console.log('⚠️ Failed to get details:', details.error);
      }

      // 5. Clean up: Delete test meeting
      console.log('\n5. Cleaning up test meeting...');
      const deleteResult = await ZohoMeetingService.deleteMeeting(
        testMeeting.meetingId
      );

      if (deleteResult.success) {
        console.log('✅ Test meeting deleted successfully!');
      } else {
        console.log('⚠️ Failed to delete meeting:', deleteResult.error);
      }
    } else {
      console.log('❌ Failed to create test meeting:', testMeeting.error);

      // Check common issues
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if .env has all Zoho credentials');
      console.log('2. Verify Zoho account has Meeting access');
      console.log('3. Check if refresh token is valid');
      console.log('4. Ensure Zoho_EMAIL matches the host account');
    }
  } catch (error) {
    console.error('❌ Critical error during test:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n🧪 Test completed!');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  testZohoConnection();
}

module.exports = testZohoConnection;
