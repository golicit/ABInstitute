const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Users = require('../Model/user');
const { generateToken, authenticateToken } = require('../middleware/auth');
const {
  validate,
  userRegistrationSchema,
  userLoginSchema,
} = require('../middleware/validation');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const router = express.Router();

const googleAuthRouter = require('./auth/googleAuth');

// Google OAuth Code Exchange endpoint (MUST be before router.use('/google'))
router.post('/google-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }

    console.log('🔐 Exchanging Google code for token');

    // Exchange code for tokens with Google
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code'
    });

    console.log('✅ Token received from Google');

    // Get user info from Google
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`
      }
    });

    const userData = userInfoResponse.data;
    const { email, name, picture } = userData;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email not provided by Google'
      });
    }

    console.log('👤 Google user:', { email, name });

    // Find or create user
    let user = await Users.findOne({ email });

    if (!user) {
      user = await Users.create({
        email,
        name,
        picture,
        provider: 'google',
        googleId: userData.id
      });
      console.log('✅ New user created:', user._id);
    } else {
      console.log('✅ Existing user found:', user._id);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('❌ Google OAuth error:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      error: 'Authentication failed',
      message: error.response?.data?.error || error.message
    });
  }
});

// Google login route - both /google and /google-login
router.use('/google-oauth', googleAuthRouter);
router.use('/google-login', googleAuthRouter);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register endpoint
router.post(
  '/register',
  authLimiter,
  validate(userRegistrationSchema),
  async (req, res) => {
    try {
      const { name, email, password, phone, role } = req.body;

      // Check if user already exists
      const existingUser = await Users.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userData = {
        name,
        email,
        passwordHash,
        phone,
        role: role || 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        orders: [],
        testimonials: [],
      };

      const user = new Users(userData);
      await user.save();

      // Generate token
      const token = generateToken(user._id, user.role);

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  }
);

// Login endpoint
router.post(
  '/login',
  authLimiter,
  validate(userLoginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await Users.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Generate token
      const token = generateToken(user._id, user.role);

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  }
);

// Logout endpoint (client-side token removal, but server can blacklist if needed)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.',
  });
});

// Forgot password endpoint
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if user exists
    const user = await Users.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.json({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Save it to the database with expiration
    // 3. Send email with reset link

    // For now, we'll just simulate the process
    console.log(`Password reset requested for: ${email}`);

    // TODO: Implement actual email sending logic here
    // You can use nodemailer, SendGrid, or similar service

    res.json({
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    });
  }
});

// Change password endpoint
router.post(
  '/change-password',
  authenticateToken,
  async (req, res) => {
    try {
      console.log('=== CHANGE PASSWORD REQUEST ===');
      console.log('URL:', req.originalUrl);
      console.log('Path:', req.path);
      console.log('Params:', req.params);
      console.log('User ID from token:', req.user._id);
      console.log('Request body:', { ...req.body, oldPassword: '[REDACTED]', newPassword: '[REDACTED]', confirmPassword: '[REDACTED]' });
      
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user._id;

      // Validate inputs
      if (!oldPassword || !newPassword || !confirmPassword) {
        console.log('Validation failed: Missing fields');
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New passwords do not match',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Get user with password hash
      const user = await Users.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(
        oldPassword,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      console.log('Updating password for user:', userId);
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date();
      await user.save();

      console.log('Password updated successfully for user:', userId);
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('=== CHANGE PASSWORD ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  }
);

// Verify token endpoint
router.get(
  '/verify',
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
      },
    });
  }
);

module.exports = router;
