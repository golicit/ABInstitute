const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { google } = require('googleapis'); // ADD THIS
const User = require('../../Model/user');

const router = express.Router();

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL ||
    `${process.env.FRONTEND_URL}/auth/google/callback`
);

// Route 1: Get Google OAuth URL for calendar access
router.get('/calendar-auth-url', async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar', // ADD CALENDAR SCOPE
      ],
      prompt: 'consent', // Force to get refresh_token every time
      state: req.query.userId || '', // Optional: pass user ID
    });

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'failed_to_generate_auth_url',
    });
  }
});

// Route 2: Handle Google OAuth callback (for calendar)
router.get('/calendar-callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'code_missing',
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Get user info from token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Find or create user
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        email: payload.email,
        name: payload.name || 'Google User',
        picture: payload.picture,
        provider: 'google',
        googleId: payload.sub,
      });
    }

    // 🔥 CRITICAL: Save refresh token for calendar access
    user.googleRefreshToken = tokens.refresh_token;
    user.googleAccessToken = tokens.access_token;
    user.googleTokenExpiry = tokens.expiry_date;
    user.googleCalendarConnected = true;

    await user.save();

    // Generate JWT for your app
    const jwtToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        provider: 'google',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      }
    );

    // Redirect to frontend with tokens
    const redirectUrl =
      `${process.env.FRONTEND_URL}/auth/google/callback?` +
      new URLSearchParams({
        success: 'true',
        token: jwtToken,
        userId: user._id,
        calendarConnected: 'true',
      }).toString();

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    const redirectUrl =
      `${process.env.FRONTEND_URL}/auth/google/callback?` +
      new URLSearchParams({
        success: 'false',
        error: 'calendar_connection_failed',
      }).toString();
    res.redirect(redirectUrl);
  }
});

// Route 3: Your existing Google login (keep this for regular sign-in)
router.post('/', async (req, res) => {
  try {
    console.log('🔐 Google OAuth request received');

    const { token: accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'access_token_missing',
      });
    }

    // 🔹 Fetch user info from Google using access_token
    const googleRes = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { email, name, picture, sub } = googleRes.data;

    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'invalid_google_token',
      });
    }

    console.log('👤 Google user:', email);

    // 🔹 Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: name || 'Google User',
        picture,
        provider: 'google',
        googleId: sub,
      });
    } else {
      user.name = name || user.name;
      user.picture = picture || user.picture;
      user.googleId = sub;
      await user.save();
    }

    // 🔹 Generate JWT
    const jwtToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        provider: 'google',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      }
    );

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleCalendarConnected: !!user.googleRefreshToken, // Add this field
      },
    });
  } catch (error) {
    console.error(
      '❌ Google OAuth Error:',
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error: 'google_login_failed',
    });
  }
});

module.exports = router;
