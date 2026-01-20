const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Users = require('../Model/user');
const { generateToken, authenticateToken } = require('../middleware/auth');
const {
  validate,
  userRegistrationSchema,
  userLoginSchema,
  forgotPasswordSchema,
} = require('../middleware/validation');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

const googleAuthRouter = require('./auth/googleAuth');

// Google login route
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

      // Hash password - THIS IS WHERE PASSWORD GETS HASHED
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userData = {
        name,
        email,
        passwordHash, // Store the hashed password
        phone,
        role: role || 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        orders: [],
        testimonials: [],
      };

      const user = new Users(userData);
      await user.save();

      // AUTO-ASSIGN BATCH TO NEW USER
      const batchService = require('../services/batchService');
      try {
        const batchResult = await batchService.assignBatchToStudent(user._id);
        console.log(`✅ New user assigned to batch: ${batchResult.batchName}`);

        // Update user with batch info for response
        user.batch = batchResult.batchName;
      } catch (batchError) {
        console.error('Batch assignment failed:', batchError.message);
        // Don't fail registration if batch assignment fails
      }

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

// routes/auth.js - Login endpoint with double-hash fix
router.post(
  '/login',
  authLimiter,
  validate(userLoginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log('Login attempt for email:', email);
      console.log('Password length:', password.length);

      // Find user by email
      const user = await Users.findOne({ email });
      if (!user) {
        console.log('User not found for email:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      console.log('User found:', user.email);
      console.log('User has passwordHash?', !!user.passwordHash);

      // Verify password - normal check
      let isPasswordValid = false;

      if (user.passwordHash) {
        // Try normal password comparison first
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        // If not valid and passwordHash looks like a bcrypt hash, it might be double-hashed
        if (!isPasswordValid && user.passwordHash.startsWith('$2')) {
          console.log('Checking for double-hashed password...');

          // For debugging: Log the hash structure
          console.log(
            'Password hash starts with:',
            user.passwordHash.substring(0, 30) + '...'
          );

          // Try to hash the input password once and compare
          // This handles the case where password was double-hashed in old system
          try {
            const singleHash = await bcrypt.hash(password, 12);
            isPasswordValid = singleHash === user.passwordHash;

            if (isPasswordValid) {
              console.log(
                '✅ Password matched (was double-hashed in old system)'
              );

              // Re-hash correctly (single hash) for future logins
              const correctHash = await bcrypt.hash(password, 12);
              user.passwordHash = correctHash;
              await user.save();
              console.log('✅ Fixed password hash for user:', user.email);
            }
          } catch (hashError) {
            console.log('Error checking double-hash:', hashError.message);
          }
        }
      }

      if (!isPasswordValid) {
        console.log('Invalid password for email:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Generate token
      const token = generateToken(user._id, user.role);

      // Update login stats
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete userResponse.passwordHash;
      delete userResponse.googleRefreshToken;
      delete userResponse.googleAccessToken;
      delete userResponse.resetPasswordToken;
      delete userResponse.resetPasswordExpires;

      console.log('✅ Login successful for user:', user.email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
          isPaidUser: user.isPaidUser,
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

// Forgot password endpoint - UPDATED with email sending
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await Users.findOne({ email });
      if (!user) {
        // For security, don't reveal if email exists
        return res.json({
          success: true,
          message:
            'If an account with that email exists, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = Date.now() + 3600000; // 1 hour from now

      // Save token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save();

      // Create reset URL
      const resetUrl = `${
        process.env.FRONTEND_URL || 'http://localhost:5173'
      }/auth?tab=reset&token=${resetToken}`;

      // Configure nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // Email content
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_FROM || 'noreply@abinstitute.com',
        subject: 'Password Reset Request - AB Institute',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .warning { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AB Institute</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${user.name || user.email},</p>
              <p>We received a request to reset your password for your AB Institute account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              <p class="warning">This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              <div class="footer">
                <p>Best regards,<br>The AB Institute Team</p>
                <p>© ${new Date().getFullYear()} AB Institute. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      };

      // Send email
      await transporter.sendMail(mailOptions);

      console.log(`✅ Password reset email sent to: ${email}`);

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
  }
);

// Verify reset token
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with valid reset token
    const user = await Users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Reset token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset token',
    });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Find user with valid reset token
    const user = await Users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

    // Hash new password CORRECTLY (single hash)
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.passwordHash = newPasswordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();

    // Clear any existing tokens/sessions
    user.googleAccessToken = undefined;
    user.googleRefreshToken = undefined;
    user.googleTokenExpiry = undefined;

    await user.save();

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_FROM || 'noreply@abinstitute.com',
      subject: 'Password Changed Successfully - AB Institute',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AB Institute</h1>
            </div>
            <div class="content">
              <h2>Password Changed Successfully</h2>
              <p>Hello ${user.name || user.email},</p>
              <p>Your password has been changed successfully.</p>
              <p>If you did not make this change, please contact our support team immediately.</p>
              <div class="footer">
                <p>Best regards,<br>The AB Institute Team</p>
                <p>© ${new Date().getFullYear()} AB Institute. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Password reset successfully for user: ${user.email}`);

    res.json({
      success: true,
      message:
        'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    });
  }
});

// Change password endpoint (for logged in users)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!oldPassword || !newPassword || !confirmPassword) {
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

    // Hash new password CORRECTLY
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user,
    },
  });
});

module.exports = router;
