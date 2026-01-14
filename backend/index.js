const express = require('express');
const bcrypt = require('bcrypt');
const connectMongo = require('./DB');
require('dotenv').config();

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Import routes
const adminTutoringRoutes = require('./routes/adminTutoring');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const courseRoutes = require('./routes/course');
const paymentRoutes = require('./routes/payment');
const studentRoutes = require('./routes/studentRoutes');
const classScheduleRoutes = require('./routes/classSchedule');
const webinarRoutes = require('./routes/webinar');
const batchRoutes = require('./routes/batches');
const tutoringStudentRoutes = require('./routes/tutoringStudents'); // ADD THIS LINE

// Import Models
const Users = require('./Model/user');
const Courses = require('./Model/course');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Enable CORS
const cors = require('cors');
const allowedOrigins = [
  'http://localhost:3000',
  'https://abdash.netlify.app',
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// IMPORTANT: Add this middleware to handle raw body for webhooks
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Test route
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date(),
    port: process.env.PORT,
    razorpay: process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured',
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'payment-api',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Debug: Log environment
console.log('=== Environment Check ===');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✓' : '✗');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓' : '✗');
console.log('PORT:', process.env.PORT || 3000);
console.log('=========================');

// API Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', authenticateToken, adminTutoringRoutes);
app.use('/api/classes', classScheduleRoutes);
app.use('/api/webinars', webinarRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/tutoring-students', tutoringStudentRoutes); // ADD THIS LINE - BEFORE the duplicate

// REMOVE THIS DUPLICATE LINE - COMMENT IT OUT OR DELETE IT:
// app.use('/api/students', studentRoutes); // ← THIS IS A DUPLICATE, REMOVE OR COMMENT THIS LINE

// ============== LEGACY ROUTES (Consider moving to route files) ==============

// Get all users
app.get('/', async (req, res) => {
  try {
    console.log('GET / - Fetching all users');
    const data = await Users.find({}).select('-passwordHash');
    console.log(`Found ${data.length} users`);
    res.status(200).json({
      success: true,
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
});

// Create new user
app.post('/', async (req, res) => {
  try {
    console.log('POST / - Creating new user:', req.body);
    const { name, email, Phone, password, role, orders, testimonials } =
      req.body;

    // Validate required fields
    if (!name || !email || !Phone || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: name, email, Phone, and password are required',
      });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user object
    const userData = {
      name,
      email,
      Phone,
      passwordHash,
      role: role || 'user',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      orders: orders || [],
      testimonials: testimonials || [],
    };

    const User = new Users(userData);
    await User.save();

    console.log('User created successfully with ID:', User._id);

    // Remove password hash from response
    const userResponse = User.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message,
    });
  }
});

// Get user by ID
app.get('/user/:id', async (req, res) => {
  try {
    console.log('GET /user/:id - Fetching user with ID:', req.params.id);
    const user = await Users.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
});

// Update user
app.put('/user/:id', async (req, res) => {
  try {
    console.log('PUT /user/:id - Updating user:', req.params.id, req.body);
    const updateData = { ...req.body };

    if (updateData.password) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(
        updateData.password,
        saltRounds
      );
      delete updateData.password;
    }

    updateData.updatedAt = new Date();

    const user = await Users.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
});

// Delete user
app.delete('/user/:id', async (req, res) => {
  try {
    console.log('DELETE /user/:id - Deleting user:', req.params.id);
    const user = await Users.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
});

// ============== COURSE ENDPOINTS ==============

// Get all courses
app.get('/courses', async (req, res) => {
  try {
    console.log('GET /courses - Fetching all courses');
    const courses = await Courses.find({});
    console.log(`Found ${courses.length} courses`);
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message,
    });
  }
});

// Get active courses only
app.get('/courses/active', async (req, res) => {
  try {
    console.log('GET /courses/active - Fetching active courses');
    const courses = await Courses.find({ isActive: true });
    console.log(`Found ${courses.length} active courses`);
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error('Error fetching active courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active courses',
      error: error.message,
    });
  }
});

// Create new course
app.post('/courses', async (req, res) => {
  try {
    console.log('POST /courses - Creating new course:', req.body);
    const { title, description, price, originalPrice, isActive } = req.body;

    // Validate required fields
    if (!title || !description || !price || !originalPrice) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: title, description, price, and originalPrice are required',
      });
    }

    // Create course object
    const courseData = {
      title,
      description,
      price,
      originalPrice,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const course = new Courses(courseData);
    await course.save();

    console.log('Course created successfully with ID:', course._id);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    console.error('Error creating course:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message,
    });
  }
});

// Get course by ID
app.get('/courses/:id', async (req, res) => {
  try {
    console.log('GET /courses/:id - Fetching course with ID:', req.params.id);
    const course = await Courses.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message,
    });
  }
});

// Update course
app.put('/courses/:id', async (req, res) => {
  try {
    console.log('PUT /courses/:id - Updating course:', req.params.id, req.body);
    const updateData = { ...req.body };
    updateData.updatedAt = new Date();

    const course = await Courses.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message,
    });
  }
});

// Delete course
app.delete('/courses/:id', async (req, res) => {
  try {
    console.log('DELETE /courses/:id - Deleting course:', req.params.id);
    const course = await Courses.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message,
    });
  }
});

// ============== ERROR HANDLING MIDDLEWARE ==============

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('✅ Database connected successfully');

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 API available at: http://localhost:${PORT}`);
      console.log(`🔗 Test endpoint: http://localhost:${PORT}/test`);
      console.log(`💳 Payment endpoints: http://localhost:${PORT}/api/payment`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(
        `👥 Tutoring students: http://localhost:${PORT}/api/tutoring-students`
      );
      console.log(`📅 Webinars: http://localhost:${PORT}/api/webinars`);
      console.log(`🎯 Batches: http://localhost:${PORT}/api/batches`);
      console.log('\n=== WEBINAR & TUTORING SYSTEM READY ===');
      console.log(
        `Razorpay Key ID: ${
          process.env.RAZORPAY_KEY_ID ? 'Configured' : 'NOT CONFIGURED!'
        }`
      );
      console.log('=========================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
