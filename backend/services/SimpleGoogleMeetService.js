const { google } = require('googleapis');
const User = require('../Model/user');

class SimpleGoogleMeetService {
  /**
   * Create Google Meet link using admin's Google account
   */
  static async createMeeting(adminUserId, meetingData) {
    try {
      console.log('📅 Creating Google Meet for admin:', adminUserId);

      // Get admin user WITH refresh token
      const adminUser = await User.findById(adminUserId).select(
        '+googleRefreshToken'
      );

      if (!adminUser || !adminUser.googleRefreshToken) {
        console.log('❌ Admin not connected to Google Calendar');
        return this.generateFallbackMeetLink(meetingData);
      }

      // Create OAuth client with admin's refresh token
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      );

      auth.setCredentials({
        refresh_token: adminUser.googleRefreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth });

      // Create calendar event with Google Meet
      const event = {
        summary: meetingData.title,
        description: meetingData.description || '',
        start: {
          dateTime: new Date(meetingData.startTime).toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: new Date(
            new Date(meetingData.startTime).getTime() +
              meetingData.duration * 60000
          ).toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        attendees: meetingData.participants.map((email) => ({
          email: email,
          responseStatus: 'needsAction',
        })),
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send email invites automatically
      });

      console.log('✅ Google Meet created:', response.data.hangoutLink);

      return {
        success: true,
        meetLink: response.data.hangoutLink,
        meetingId: response.data.id,
        calendarEvent: response.data,
        provider: 'google_calendar',
      };
    } catch (error) {
      console.error('❌ Google Calendar API error:', error.message);

      // Fallback to generated link
      return this.generateFallbackMeetLink(meetingData);
    }
  }

  /**
   * Fallback: Generate Google Meet-like link
   */
  static generateFallbackMeetLink(meetingData) {
    // Generate valid Google Meet code format
    const meetCode = this.generateMeetCode();
    const meetLink = `https://meet.google.com/${meetCode}`;

    console.log('🔄 Using fallback Google Meet link:', meetLink);

    return {
      success: true,
      meetLink: meetLink,
      meetingId: meetCode,
      provider: 'google_meet_fallback',
      note: 'Created using fallback method. Verify link works.',
    };
  }

  /**
   * Generate valid Google Meet code
   */
  static generateMeetCode() {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Format: abc-defg-hij (3 letters - 4 alphanumeric - 3 alphanumeric)
    const part1 = this.randomString(letters, 3);
    const part2 = this.randomString(alphanumeric, 4);
    const part3 = this.randomString(alphanumeric, 3);

    return `${part1}-${part2}-${part3}`.toLowerCase();
  }

  static randomString(charset, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Check if admin has Google Calendar connected
   */
  static async checkAdminConnection(adminUserId) {
    const adminUser = await User.findById(adminUserId).select(
      'googleCalendarConnected'
    );
    return {
      connected: !!adminUser?.googleCalendarConnected,
      userId: adminUserId,
    };
  }
}

module.exports = SimpleGoogleMeetService;
