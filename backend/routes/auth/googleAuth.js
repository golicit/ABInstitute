const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../../Model/user');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    console.log('🔐 Google OAuth request received');

    const { token } = req.body;

    if (!token) {
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
          Authorization: `Bearer ${token}`,
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
