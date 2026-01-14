const axios = require('axios');
const qs = require('querystring');

class ZohoMeetingService {
  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseURL = 'https://meeting.zoho.com/api/v2';
  }

  async getAccessToken() {
    // Return existing token if valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    console.log('🔑 Refreshing Zoho access token...');

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        qs.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      console.log('✅ Zoho access token refreshed');
      return this.accessToken;
    } catch (error) {
      console.error(
        '❌ Failed to refresh Zoho token:',
        error.response?.data || error.message
      );
      throw new Error(`Zoho token refresh failed: ${error.message}`);
    }
  }

  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        topic: meetingData.title,
        agenda: meetingData.description || 'Tutoring Session',
        type: meetingData.type === 'webinar' ? 5 : 2, // 5=webinar, 2=scheduled meeting
        start_time: meetingData.startTime, // Must be ISO string
        duration: meetingData.duration || 60,
        host_email: meetingData.hostEmail,
        participants: meetingData.participants || [],
        settings: {
          host_video: true,
          participant_video: meetingData.type === 'one_on_one', // Only 1:1 can use video
          join_before_host: false,
          mute_upon_entry: meetingData.type === 'webinar', // Mute in webinar
          auto_recording: 'cloud',
          waiting_room: true,
          allow_multiple_devices: false,
        },
      };

      console.log('📅 Creating Zoho meeting:', {
        topic: payload.topic,
        type: payload.type === 5 ? 'Webinar' : 'Meeting',
        time: payload.start_time,
      });

      const response = await axios.post(`${this.baseURL}/meetings`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      console.log('✅ Zoho meeting created:', response.data.id);

      return {
        success: true,
        meetingId: response.data.id,
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        password: response.data.password,
        rawResponse: response.data,
      };
    } catch (error) {
      console.error('❌ Zoho Meeting creation failed:', {
        error: error.response?.data || error.message,
        meetingData: {
          title: meetingData.title,
          type: meetingData.type,
          host: meetingData.hostEmail,
        },
      });

      return {
        success: false,
        error:
          error.response?.data?.message || error.message || 'Unknown error',
        details: error.response?.data,
      };
    }
  }

  async sendInvitations(meetingId, emails, customMessage) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/meetings/${meetingId}/invitation`,
        {
          emails: emails,
          subject: 'Invitation: Tutoring Session',
          message:
            customMessage ||
            'You are invited to join a tutoring session. Please join on time.',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log(
        `✅ Invitations sent for meeting ${meetingId} to ${emails.length} participants`
      );

      return {
        success: true,
        data: response.data,
        sentTo: emails,
      };
    } catch (error) {
      console.error(
        '❌ Failed to send invitations:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.message,
        sentTo: emails,
      };
    }
  }

  async getMeetingDetails(meetingId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        '❌ Failed to get meeting details:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.delete(
        `${this.baseURL}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      console.log(`✅ Meeting ${meetingId} deleted from Zoho`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        '❌ Failed to delete meeting:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateMeeting(meetingId, updates) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.put(
        `${this.baseURL}/meetings/${meetingId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        '❌ Failed to update meeting:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new ZohoMeetingService();
