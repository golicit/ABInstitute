const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../../Model/user');

const router = express.Router();

/**
 * IMPORTANT:
 * - Use ONLY client_id in constructor
 * - client_secret is sent during token exchange
 */
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req, res) => {
  try {
    console.log('🔐 Google OAuth request received');

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    console.log('📝 Exchanging authorization code for tokens');

    // ✅ REQUIRED for Google Identity Services (GIS)
    const { tokens } = await client.getToken({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'postmessage',
    });

    if (!tokens || !tokens.id_token) {
      return res.status(400).json({
        success: false,
        error: 'Failed to retrieve ID token from Google',
      });
    }

    console.log('✅ Tokens received from Google');

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        error: 'Email not provided by Google',
      });
    }

    const { email, name, picture, sub } = payload;

    console.log('👤 Google user:', email);

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      console.log('📝 Creating new Google user');
      user = await User.create({
        email,
        name: name || 'Google User',
        picture,
        provider: 'google',
        googleId: sub,
      });
    } else {
      // Update profile data if changed
      user.name = name || user.name;
      user.picture = picture || user.picture;
      user.googleId = sub;
      await user.save();
    }

    // Generate JWT
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

    console.log('✅ JWT generated, login successful');

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error(
      '❌ Google OAuth error:',
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.response?.data?.error || error.message || 'Google login failed',
    });
  }
});

module.exports = router;
