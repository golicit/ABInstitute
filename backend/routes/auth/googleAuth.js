const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../../Model/user.js');
const axios = require('axios');

const router = express.Router();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// Exchange authorization code for tokens
router.post('/', async (req, res) => {
  try {
    console.log('🔐 Google auth endpoint hit!');
    const { code } = req.body;

    if (!code) {
      console.log('❌ No code provided');
      return res.status(400).json({ 
        success: false, 
        error: 'Authorization code is required' 
      });
    }

    console.log('📝 Exchanging code for tokens...');

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    console.log('✅ Tokens received');

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('👤 Google user:', payload.email);

    const { email, name, picture, sub } = payload;

    if (!email) {
      console.log('❌ No email in token payload');
      return res.status(400).json({ 
        success: false,
        error: 'Email not provided in token' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      console.log('📝 Creating new user...');
      user = await User.create({
        email,
        name: name || 'Google User',
        picture,
        provider: 'google',
        googleId: sub,
      });
      console.log('✅ New user created:', user._id);
    } else {
      console.log('✅ Existing user found:', user._id);
      user.name = name || user.name;
      user.picture = picture || user.picture;
      user.googleId = sub;
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        provider: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ JWT token generated');

    res.json({
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
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Google authentication failed',
    });
  }
});

module.exports = router;