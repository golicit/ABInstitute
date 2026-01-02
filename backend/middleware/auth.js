const jwt = require('jsonwebtoken');
const Users = require('../Model/user');

// Generate JWT token
const generateToken = (userId, role = 'user') => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: '3h',
  });
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    console.log('=== AUTHENTICATE TOKEN MIDDLEWARE ===');
    console.log('Request URL:', req.originalUrl);
    console.log(
      'Authorization header:',
      req.headers.authorization ? 'Present' : 'Missing'
    );

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('No token found in authorization header');
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    console.log('Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('decoooo', decoded);
    console.log('Token verified. User ID:', decoded.id);
    // Get user from database to ensure they still exist
    const user = await Users.findById(decoded.id).select('-passwordHash');

    if (!user) {
      console.log('User not found in database for userId:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('User authenticated:', user._id);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await Users.findById(decoded.userId).select('-passwordHash');
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid/expired
    next();
  }
};
const requirePaidUser = async (req, res, next) => {
  const user = await Users.findById(req.user._id);

  if (['admin', 'owner', 'developer'].includes(user.role)) {
    return next();
  }

  if (!user.isPaidUser) {
    return res.status(403).json({
      success: false,
      message: 'Payment required to access this resource',
    });
  }

  next();
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
};

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const resourceId = req.params[resourceIdParam];
    const isOwner = req.user._id.toString() === resourceId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources',
      });
    }

    next();
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  requirePaidUser,
};
