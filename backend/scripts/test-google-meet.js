require('dotenv').config();
const MeetingService = require('../services/GoogleMeetService');

async function testGoogleMeet() {
  console.log('🧪 Testing Google Meet Integration\n');

  try {
    // 1. Test meeting creation
    console.log('1. Creating Google Meet...');
    const meeting = await MeetingService.createMeeting({
      title: 'Test Google Meet Session',
      description: 'Testing Google Meet integration',
      type: 'one_on_one',
      startTime: new Date(Date.now() + 3600000).toISOString(),
      duration: 60,
      hostEmail: 'test@example.com',
      participants: ['test@example.com'],
    });

    if (meeting.success) {
      console.log('✅ Google Meet created successfully!');
      console.log('   Meeting ID:', meeting.meetingId);
      console.log('   Join URL:', meeting.join_url);
      console.log(
        '   Format:',
        meeting.meetingId.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/)
          ? '✅ Valid'
          : '❌ Invalid'
      );

      // 2. Test sending invitations
      console.log('\n2. Testing email invitations...');
      const inviteResult = await MeetingService.sendInvitations(
        meeting.meetingId,
        ['test@example.com'],
        'Test Google Meet invitation'
      );

      if (inviteResult.success) {
        console.log('✅ Invitations sent (or simulated)');
        console.log('   Meeting link:', inviteResult.meetingLink);
      }

      // 3. Test getting details
      console.log('\n3. Testing meeting details...');
      const details = await MeetingService.getMeetingDetails(meeting.meetingId);
      console.log('   Status:', details.success ? '✅' : '❌');
    } else {
      console.log('❌ Failed to create meeting:', meeting.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n✅ Google Meet test completed!');
  console.log('\n🎯 Next steps:');
  console.log(
    '1. Set ZOHO_SMTP_USER and ZOHO_SMTP_PASSWORD in .env for emails'
  );
  console.log('2. Test the frontend at /dashboard/admin-webinars');
}

testGoogleMeet();
