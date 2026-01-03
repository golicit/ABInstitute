const express = require('express');
const bcrypt = require('bcryptjs');
const Users = require('./Model/user'); // Fixed path
const Courses = require('./Model/course'); // Add course model
const Webinar = require('./Model/webinar'); // Add webinar model
const OrderItem = require('./Model/orderItem'); // Add OrderItem model
const Invoice = require('./Model/invoice'); // Add Invoice model
const Coupon = require('./Model/coupon'); // Add Coupon model
const payment = require('./Model/Payment_r'); // Add Payment model
const Testimonial = require('./Model/testimonial'); // Add Testimonial model

// Try to import Order model with robust error handling
let Order = null;
try {
  Order = require('./Model/order');
  console.log('✅ Order model loaded successfully');
} catch (error) {
  console.log('⚠️ Order model import failed:', error.message);
  console.log('   Order routes will be disabled. Please check:');
  console.log('   1. File exists: ./Model/order.js');
  console.log('   2. File has no syntax errors');
  console.log('   3. All dependencies are installed');
}

const router = express.Router();

// Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// 🟢 Register Route
router.post('/register', async (req, res) => {
  try {
    console.log('🚀 Registration request:', req.body);
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, Email, and Password are required',
      });
    }

    // Check if user already exists
    const exist = await Users.findOne({ email });
    if (exist) {
      console.log('❌ User already exists:', email);
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new Users({
      name,
      email,
      passwordHash,
    });

    const savedUser = await newUser.save();
    console.log('✅ User registered successfully:', savedUser._id);

    res.status(201).json({
      success: true,
      message: 'User Registered Successfully',
      data: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 Login Route
router.post('/login', async (req, res) => {
  try {
    console.log('🚀 Login request:', req.body);
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Email and Password are required',
      });
    }

    // Check if user exists
    const user = await Users.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User logged in successfully:', user._id);

    res.status(200).json({
      success: true,
      message: 'Login Successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 COURSE ROUTES

// Get all courses
router.get('/courses', async (req, res) => {
  try {
    console.log('🚀 Get all courses request');
    const courses = await Courses.find({ isActive: true }).sort({
      createdAt: -1,
    });

    console.log(`✅ Found ${courses.length} active courses`);
    res.status(200).json({
      success: true,
      message: 'Courses fetched successfully',
      data: courses,
    });
  } catch (err) {
    console.error('❌ Get courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get course by slug
router.get('/courses/:slug', async (req, res) => {
  try {
    console.log('🚀 Get course by slug request:', req.params.slug);
    const course = await Courses.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!course) {
      console.log('❌ Course not found:', req.params.slug);
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    console.log('✅ Course found:', course._id);
    res.status(200).json({
      success: true,
      message: 'Course fetched successfully',
      data: course,
    });
  } catch (err) {
    console.error('❌ Get course error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new course
router.post('/courses', async (req, res) => {
  try {
    console.log('🚀 Create course request:', req.body);
    const { title, description, price, originalPrice } = req.body;

    // Input validation
    if (!title || !description || !price) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Title, description, and price are required',
      });
    }

    // Generate slug
    const slug = generateSlug(title);

    // Check if slug already exists
    const existingCourse = await Courses.findOne({ slug });
    if (existingCourse) {
      console.log('❌ Course with this slug already exists:', slug);
      return res.status(409).json({
        success: false,
        message: 'Course with similar title already exists',
      });
    }

    // Create new course
    const newCourse = new Courses({
      title,
      slug,
      description,
      price: parseInt(price), // Ensure it's an integer
      originalPrice: originalPrice ? parseInt(originalPrice) : null,
    });

    const savedCourse = await newCourse.save();
    console.log('✅ Course created successfully:', savedCourse._id);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: savedCourse,
    });
  } catch (err) {
    console.error('❌ Create course error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update course
router.put('/courses/:slug', async (req, res) => {
  try {
    console.log('🚀 Update course request:', req.params.slug, req.body);
    const { title, description, price, originalPrice, isActive } = req.body;

    const course = await Courses.findOne({ slug: req.params.slug });
    if (!course) {
      console.log('❌ Course not found:', req.params.slug);
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Update fields
    if (title) {
      course.title = title;
      course.slug = generateSlug(title);
    }
    if (description) course.description = description;
    if (price) course.price = parseInt(price);
    if (originalPrice !== undefined)
      course.originalPrice = originalPrice ? parseInt(originalPrice) : null;
    if (isActive !== undefined) course.isActive = isActive;

    const updatedCourse = await course.save();
    console.log('✅ Course updated successfully:', updatedCourse._id);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    });
  } catch (err) {
    console.error('❌ Update course error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete course (soft delete by setting isActive to false)
router.delete('/courses/:slug', async (req, res) => {
  try {
    console.log('🚀 Delete course request:', req.params.slug);

    const course = await Courses.findOne({ slug: req.params.slug });
    if (!course) {
      console.log('❌ Course not found:', req.params.slug);
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    course.isActive = false;
    await course.save();

    console.log('✅ Course deactivated successfully:', course._id);
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete course error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 WEBINAR ROUTES

// Get all webinars
router.get('/webinars', async (req, res) => {
  try {
    console.log('🚀 Get all webinars request');
    const webinars = await Webinar.find()
      .populate('courseId', 'title slug description')
      .sort({ scheduledAt: 1 }); // Sort by scheduled time

    console.log(`✅ Found ${webinars.length} webinars`);
    res.status(200).json({
      success: true,
      message: 'Webinars fetched successfully',
      data: webinars,
    });
  } catch (err) {
    console.error('❌ Get webinars error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get webinars by course ID
router.get('/webinars/course/:courseId', async (req, res) => {
  try {
    console.log('🚀 Get webinars by course ID request:', req.params.courseId);
    const webinars = await Webinar.find({ courseId: req.params.courseId })
      .populate('courseId', 'title slug description')
      .sort({ scheduledAt: 1 });

    console.log(
      `✅ Found ${webinars.length} webinars for course ${req.params.courseId}`
    );
    res.status(200).json({
      success: true,
      message: 'Course webinars fetched successfully',
      data: webinars,
    });
  } catch (err) {
    console.error('❌ Get course webinars error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get upcoming webinars
router.get('/webinars/upcoming', async (req, res) => {
  try {
    console.log('🚀 Get upcoming webinars request');
    const now = new Date();
    const webinars = await Webinar.find({
      scheduledAt: { $gte: now },
    })
      .populate('courseId', 'title slug description')
      .sort({ scheduledAt: 1 })
      .limit(10); // Limit to next 10 upcoming webinars

    console.log(`✅ Found ${webinars.length} upcoming webinars`);
    res.status(200).json({
      success: true,
      message: 'Upcoming webinars fetched successfully',
      data: webinars,
    });
  } catch (err) {
    console.error('❌ Get upcoming webinars error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get webinar by ID
router.get('/webinars/:id', async (req, res) => {
  try {
    console.log('🚀 Get webinar by ID request:', req.params.id);
    const webinar = await Webinar.findById(req.params.id).populate(
      'courseId',
      'title slug description'
    );

    if (!webinar) {
      console.log('❌ Webinar not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    console.log('✅ Webinar found:', webinar._id);
    res.status(200).json({
      success: true,
      message: 'Webinar fetched successfully',
      data: webinar,
    });
  } catch (err) {
    console.error('❌ Get webinar error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new webinar
router.post('/webinars', async (req, res) => {
  try {
    console.log('🚀 Create webinar request:', req.body);
    const {
      courseId,
      zoomWebinarId,
      title,
      scheduledAt,
      durationMins,
      joinUrl,
      recordingUrl,
    } = req.body;

    // Input validation
    if (!courseId || !title || !scheduledAt || !durationMins) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, scheduled time, and duration are required',
      });
    }

    // Validate that course exists
    const course = await Courses.findById(courseId);
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      console.log('❌ Invalid scheduled time - must be in future');
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future',
      });
    }

    // Validate duration
    if (durationMins < 1 || durationMins > 480) {
      // Max 8 hours
      console.log('❌ Invalid duration');
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 480 minutes',
      });
    }

    // Create new webinar
    const newWebinar = new Webinar({
      courseId,
      zoomWebinarId: zoomWebinarId || null,
      title,
      scheduledAt: scheduledDate,
      durationMins: parseInt(durationMins),
      joinUrl: joinUrl || null,
      recordingUrl: recordingUrl || null,
    });

    const savedWebinar = await newWebinar.save();

    // Populate course info for response
    await savedWebinar.populate('courseId', 'title slug description');

    console.log('✅ Webinar created successfully:', savedWebinar._id);

    res.status(201).json({
      success: true,
      message: 'Webinar created successfully',
      data: savedWebinar,
    });
  } catch (err) {
    console.error('❌ Create webinar error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update webinar
router.put('/webinars/:id', async (req, res) => {
  try {
    console.log('🚀 Update webinar request:', req.params.id, req.body);
    const {
      zoomWebinarId,
      title,
      scheduledAt,
      durationMins,
      joinUrl,
      recordingUrl,
    } = req.body;

    const webinar = await Webinar.findById(req.params.id);
    if (!webinar) {
      console.log('❌ Webinar not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    // Update fields
    if (zoomWebinarId !== undefined) webinar.zoomWebinarId = zoomWebinarId;
    if (title) webinar.title = title;
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future',
        });
      }
      webinar.scheduledAt = scheduledDate;
    }
    if (durationMins) {
      if (durationMins < 1 || durationMins > 480) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be between 1 and 480 minutes',
        });
      }
      webinar.durationMins = parseInt(durationMins);
    }
    if (joinUrl !== undefined) webinar.joinUrl = joinUrl;
    if (recordingUrl !== undefined) webinar.recordingUrl = recordingUrl;

    const updatedWebinar = await webinar.save();
    await updatedWebinar.populate('courseId', 'title slug description');

    console.log('✅ Webinar updated successfully:', updatedWebinar._id);

    res.status(200).json({
      success: true,
      message: 'Webinar updated successfully',
      data: updatedWebinar,
    });
  } catch (err) {
    console.error('❌ Update webinar error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete webinar
router.delete('/webinars/:id', async (req, res) => {
  try {
    console.log('🚀 Delete webinar request:', req.params.id);

    const webinar = await Webinar.findById(req.params.id);
    if (!webinar) {
      console.log('❌ Webinar not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Webinar not found',
      });
    }

    await Webinar.findByIdAndDelete(req.params.id);

    console.log('✅ Webinar deleted successfully:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Webinar deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete webinar error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 ORDER ITEM ROUTES

// Get all order items
router.get('/order-items', async (req, res) => {
  try {
    console.log('🚀 Get all order items request');
    const orderItems = await OrderItem.find()
      .populate('courseId', 'title slug price description')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orderItems.length} order items`);
    res.status(200).json({
      success: true,
      message: 'Order items fetched successfully',
      data: orderItems,
    });
  } catch (err) {
    console.error('❌ Get order items error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get order items by order ID
router.get('/order-items/order/:orderId', async (req, res) => {
  try {
    console.log('🚀 Get order items by order ID request:', req.params.orderId);
    const orderItems = await OrderItem.find({ orderId: req.params.orderId })
      .populate('courseId', 'title slug price description')
      .sort({ createdAt: -1 });

    console.log(
      `✅ Found ${orderItems.length} order items for order ${req.params.orderId}`
    );
    res.status(200).json({
      success: true,
      message: 'Order items fetched successfully',
      data: orderItems,
    });
  } catch (err) {
    console.error('❌ Get order items error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get order item by ID
router.get('/order-items/:id', async (req, res) => {
  try {
    console.log('🚀 Get order item by ID request:', req.params.id);
    const orderItem = await OrderItem.findById(req.params.id).populate(
      'courseId',
      'title slug price description'
    );

    if (!orderItem) {
      console.log('❌ Order item not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order item not found',
      });
    }

    console.log('✅ Order item found:', orderItem._id);
    res.status(200).json({
      success: true,
      message: 'Order item fetched successfully',
      data: orderItem,
    });
  } catch (err) {
    console.error('❌ Get order item error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new order item
router.post('/order-items', async (req, res) => {
  try {
    console.log('🚀 Create order item request:', req.body);
    const { orderId, courseId, unitPrice, quantity } = req.body;

    // Input validation
    if (!orderId || !courseId || !unitPrice) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Order ID, Course ID, and Unit Price are required',
      });
    }

    // Validate that course exists
    const course = await Courses.findById(courseId);
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Validate unitPrice and quantity
    if (unitPrice < 0) {
      console.log('❌ Invalid unit price');
      return res.status(400).json({
        success: false,
        message: 'Unit price must be non-negative',
      });
    }

    if (quantity && quantity < 1) {
      console.log('❌ Invalid quantity');
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    // Check if order item already exists for this order and course
    const existingOrderItem = await OrderItem.findOne({ orderId, courseId });
    if (existingOrderItem) {
      console.log('❌ Order item already exists for this order and course');
      return res.status(409).json({
        success: false,
        message: 'Order item already exists for this order and course',
      });
    }

    // Create new order item
    const newOrderItem = new OrderItem({
      orderId: parseInt(orderId),
      courseId,
      unitPrice: parseInt(unitPrice),
      quantity: quantity ? parseInt(quantity) : 1,
    });

    const savedOrderItem = await newOrderItem.save();

    // Populate course info for response
    await savedOrderItem.populate('courseId', 'title slug price description');

    console.log('✅ Order item created successfully:', savedOrderItem._id);

    res.status(201).json({
      success: true,
      message: 'Order item created successfully',
      data: savedOrderItem,
    });
  } catch (err) {
    console.error('❌ Create order item error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update order item
router.put('/order-items/:id', async (req, res) => {
  try {
    console.log('🚀 Update order item request:', req.params.id, req.body);
    const { unitPrice, quantity } = req.body;

    const orderItem = await OrderItem.findById(req.params.id);
    if (!orderItem) {
      console.log('❌ Order item not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order item not found',
      });
    }

    // Update fields
    if (unitPrice !== undefined) {
      if (unitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit price must be non-negative',
        });
      }
      orderItem.unitPrice = parseInt(unitPrice);
    }

    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1',
        });
      }
      orderItem.quantity = parseInt(quantity);
    }

    const updatedOrderItem = await orderItem.save();
    await updatedOrderItem.populate('courseId', 'title slug price description');

    console.log('✅ Order item updated successfully:', updatedOrderItem._id);

    res.status(200).json({
      success: true,
      message: 'Order item updated successfully',
      data: updatedOrderItem,
    });
  } catch (err) {
    console.error('❌ Update order item error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete order item
router.delete('/order-items/:id', async (req, res) => {
  try {
    console.log('🚀 Delete order item request:', req.params.id);

    const orderItem = await OrderItem.findById(req.params.id);
    if (!orderItem) {
      console.log('❌ Order item not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order item not found',
      });
    }

    await OrderItem.findByIdAndDelete(req.params.id);

    console.log('✅ Order item deleted successfully:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Order item deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete order item error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get order summary (total items and total price) by order ID
router.get('/orders/:orderId/summary', async (req, res) => {
  try {
    console.log('🚀 Get order summary request:', req.params.orderId);

    const orderItems = await OrderItem.find({
      orderId: req.params.orderId,
    }).populate('courseId', 'title slug price');

    if (orderItems.length === 0) {
      console.log('❌ No order items found for order:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'No order items found for this order',
      });
    }

    // Calculate summary
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const summary = {
      orderId: parseInt(req.params.orderId),
      totalItems,
      totalPrice,
      itemCount: orderItems.length,
      orderItems: orderItems.map((item) => ({
        id: item._id,
        courseId: item.courseId._id,
        courseTitle: item.courseId.title,
        courseSlug: item.courseId.slug,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
    };

    console.log(
      '✅ Order summary calculated successfully:',
      req.params.orderId
    );
    res.status(200).json({
      success: true,
      message: 'Order summary fetched successfully',
      data: summary,
    });
  } catch (err) {
    console.error('❌ Get order summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 ORDER ROUTES (Only if Order model is available)
if (Order) {
  // Get all orders
  router.get('/orders', async (req, res) => {
    try {
      console.log('🚀 Get all orders request');
      const orders = await Order.find()
        .populate('userId', 'name email')
        .populate('orderItems')
        .sort({ createdAt: -1 });

      console.log(`✅ Found ${orders.length} orders`);
      res.status(200).json({
        success: true,
        message: 'Orders fetched successfully',
        data: orders,
      });
    } catch (err) {
      console.error('❌ Get orders error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });

  // Get order by ID
  router.get('/orders/:id', async (req, res) => {
    try {
      console.log('🚀 Get order by ID request:', req.params.id);
      const order = await Order.findOne({ id: req.params.id })
        .populate('userId', 'name email')
        .populate('orderItems');

      if (!order) {
        console.log('❌ Order not found:', req.params.id);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      console.log('✅ Order found:', order.id);
      res.status(200).json({
        success: true,
        message: 'Order fetched successfully',
        data: order,
      });
    } catch (err) {
      console.error('❌ Get order error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });

  // Get orders by user ID
  router.get('/orders/user/:userId', async (req, res) => {
    try {
      console.log('🚀 Get orders by user ID request:', req.params.userId);
      const orders = await Order.find({ userId: req.params.userId })
        .populate('userId', 'name email')
        .populate('orderItems')
        .sort({ createdAt: -1 });

      console.log(
        `✅ Found ${orders.length} orders for user ${req.params.userId}`
      );
      res.status(200).json({
        success: true,
        message: 'User orders fetched successfully',
        data: orders,
      });
    } catch (err) {
      console.error('❌ Get user orders error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });

  // Create new order
  router.post('/orders', async (req, res) => {
    try {
      console.log('🚀 Create order request:', req.body);
      const {
        userId,
        email,
        phone,
        totalAmount,
        currency,
        status,
        couponId,
        paymentId,
      } = req.body;

      // Input validation
      if (!email || totalAmount === undefined) {
        console.log('❌ Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Email and Total Amount are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format');
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Validate total amount
      if (totalAmount < 0) {
        console.log('❌ Invalid total amount');
        return res.status(400).json({
          success: false,
          message: 'Total amount must be non-negative',
        });
      }

      // Validate user exists if userId is provided
      if (userId) {
        const user = await Users.findById(userId);
        if (!user) {
          console.log('❌ User not found:', userId);
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }
      }

      // Create new order
      const newOrder = new Order({
        userId: userId || null,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        totalAmount: parseInt(totalAmount),
        currency: currency || 'INR',
        status: status || 'created',
        couponId: couponId || null,
        paymentId: paymentId || null,
      });

      const savedOrder = await newOrder.save();

      // Populate user info for response
      if (savedOrder.userId) {
        await savedOrder.populate('userId', 'name email');
      }

      console.log('✅ Order created successfully:', savedOrder.id);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: savedOrder,
      });
    } catch (err) {
      console.error('❌ Create order error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });

  // Update order
  router.put('/orders/:id', async (req, res) => {
    try {
      console.log('🚀 Update order request:', req.params.id, req.body);
      const { phone, totalAmount, currency, status, couponId, paymentId } =
        req.body;

      const order = await Order.findOne({ id: req.params.id });
      if (!order) {
        console.log('❌ Order not found:', req.params.id);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Update fields
      if (phone !== undefined) order.phone = phone;
      if (totalAmount !== undefined) {
        if (totalAmount < 0) {
          return res.status(400).json({
            success: false,
            message: 'Total amount must be non-negative',
          });
        }
        order.totalAmount = parseInt(totalAmount);
      }
      if (currency) order.currency = currency;
      if (status) {
        const validStatuses = [
          'created',
          'pending_payment',
          'paid',
          'failed',
          'refunded',
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid status. Must be one of: ' + validStatuses.join(', '),
          });
        }
        order.status = status;
      }
      if (couponId !== undefined) order.couponId = couponId;
      if (paymentId !== undefined) order.paymentId = paymentId;

      const updatedOrder = await order.save();

      // Populate user info for response
      if (updatedOrder.userId) {
        await updatedOrder.populate('userId', 'name email');
      }

      console.log('✅ Order updated successfully:', updatedOrder.id);

      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: updatedOrder,
      });
    } catch (err) {
      console.error('❌ Update order error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });

  // Delete order (soft delete by changing status)
  router.delete('/orders/:id', async (req, res) => {
    try {
      console.log('🚀 Delete order request:', req.params.id);

      const order = await Order.findOne({ id: req.params.id });
      if (!order) {
        console.log('❌ Order not found:', req.params.id);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Instead of hard delete, we'll set status to 'cancelled' or actually delete
      // For this implementation, let's do hard delete but you can change to soft delete
      await Order.deleteOne({ id: req.params.id });

      console.log('✅ Order deleted successfully:', req.params.id);
      res.status(200).json({
        success: true,
        message: 'Order deleted successfully',
      });
    } catch (err) {
      console.error('❌ Delete order error:', err);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: err.message,
      });
    }
  });
} // End of Order routes conditional block

// 🟢 INVOICE ROUTES

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    console.log('🚀 Get all invoices request');
    const invoices = await Invoice.find()
      .populate('order')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${invoices.length} invoices`);
    res.status(200).json({
      success: true,
      message: 'Invoices fetched successfully',
      data: invoices,
    });
  } catch (err) {
    console.error('❌ Get invoices error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    console.log('🚀 Get invoice by ID request:', req.params.id);
    const invoice = await Invoice.findOne({ id: req.params.id }).populate(
      'order'
    );

    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    console.log('✅ Invoice found:', invoice.id);
    res.status(200).json({
      success: true,
      message: 'Invoice fetched successfully',
      data: invoice,
    });
  } catch (err) {
    console.error('❌ Get invoice error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get invoice by order ID
router.get('/invoices/order/:orderId', async (req, res) => {
  try {
    console.log('🚀 Get invoice by order ID request:', req.params.orderId);
    const invoice = await Invoice.findOne({
      orderId: req.params.orderId,
    }).populate('order');

    if (!invoice) {
      console.log('❌ Invoice not found for order:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order',
      });
    }

    console.log('✅ Invoice found for order:', req.params.orderId);
    res.status(200).json({
      success: true,
      message: 'Invoice fetched successfully',
      data: invoice,
    });
  } catch (err) {
    console.error('❌ Get invoice by order error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new invoice
router.post('/invoices', async (req, res) => {
  try {
    console.log('🚀 Create invoice request:', req.body);
    const { orderId, fileUrl } = req.body;

    // Input validation
    if (!orderId || !fileUrl) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Order ID and File URL are required',
      });
    }

    // Validate file URL format (basic validation)
    const urlRegex =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(fileUrl)) {
      console.log('❌ Invalid file URL format');
      return res.status(400).json({
        success: false,
        message: 'Invalid file URL format',
      });
    }

    // Check if Order exists (if Order model is available)
    if (Order) {
      const orderExists = await Order.findOne({ id: orderId });
      if (!orderExists) {
        console.log('❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
    }

    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ orderId });
    if (existingInvoice) {
      console.log('❌ Invoice already exists for order:', orderId);
      return res.status(409).json({
        success: false,
        message: 'Invoice already exists for this order',
      });
    }

    // Create new invoice
    const newInvoice = new Invoice({
      orderId: parseInt(orderId),
      fileUrl: fileUrl.trim(),
    });

    const savedInvoice = await newInvoice.save();

    // Populate order info for response
    await savedInvoice.populate('order');

    console.log('✅ Invoice created successfully:', savedInvoice.id);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: savedInvoice,
    });
  } catch (err) {
    console.error('❌ Create invoice error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    console.log('🚀 Update invoice request:', req.params.id, req.body);
    const { fileUrl } = req.body;

    const invoice = await Invoice.findOne({ id: req.params.id });
    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Update file URL if provided
    if (fileUrl) {
      // Validate file URL format
      const urlRegex =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(fileUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file URL format',
        });
      }
      invoice.fileUrl = fileUrl.trim();
    }

    const updatedInvoice = await invoice.save();
    await updatedInvoice.populate('order');

    console.log('✅ Invoice updated successfully:', updatedInvoice.id);

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice,
    });
  } catch (err) {
    console.error('❌ Update invoice error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    console.log('🚀 Delete invoice request:', req.params.id);

    const invoice = await Invoice.findOne({ id: req.params.id });
    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    await Invoice.deleteOne({ id: req.params.id });

    console.log('✅ Invoice deleted successfully:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete invoice error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 COUPON ROUTES

// Get all coupons
router.get('/coupons', async (req, res) => {
  try {
    console.log('🚀 Get all coupons request');
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    console.log(`✅ Found ${coupons.length} coupons`);
    res.status(200).json({
      success: true,
      message: 'Coupons fetched successfully',
      data: coupons,
    });
  } catch (err) {
    console.error('❌ Get coupons error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get active/valid coupons only
router.get('/coupons/active', async (req, res) => {
  try {
    console.log('🚀 Get active coupons request');
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${coupons.length} active coupons`);
    res.status(200).json({
      success: true,
      message: 'Active coupons fetched successfully',
      data: coupons,
    });
  } catch (err) {
    console.error('❌ Get active coupons error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get coupon by ID
router.get('/coupons/:id', async (req, res) => {
  try {
    console.log('🚀 Get coupon by ID request:', req.params.id);
    const coupon = await Coupon.findOne({ id: req.params.id });

    if (!coupon) {
      console.log('❌ Coupon not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    console.log('✅ Coupon found:', coupon.id);
    res.status(200).json({
      success: true,
      message: 'Coupon fetched successfully',
      data: coupon,
    });
  } catch (err) {
    console.error('❌ Get coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Validate coupon by code
router.get('/coupons/validate/:code', async (req, res) => {
  try {
    console.log('🚀 Validate coupon request:', req.params.code);
    const coupon = await Coupon.findValidCoupon(req.params.code);

    if (!coupon) {
      console.log('❌ Invalid or expired coupon:', req.params.code);
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code',
      });
    }

    console.log('✅ Valid coupon found:', coupon.code);
    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        isValid: coupon.isValid(),
        remainingUses: coupon.usageLimit
          ? coupon.usageLimit - coupon.usedCount
          : null,
      },
    });
  } catch (err) {
    console.error('❌ Validate coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Calculate discount for a coupon and amount
router.post('/coupons/calculate-discount', async (req, res) => {
  try {
    console.log('🚀 Calculate discount request:', req.body);
    const { couponCode, totalAmount } = req.body;

    if (!couponCode || totalAmount === undefined) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Coupon code and total amount are required',
      });
    }

    if (totalAmount < 0) {
      console.log('❌ Invalid total amount');
      return res.status(400).json({
        success: false,
        message: 'Total amount must be non-negative',
      });
    }

    const coupon = await Coupon.findValidCoupon(couponCode);

    if (!coupon) {
      console.log('❌ Invalid or expired coupon:', couponCode);
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code',
      });
    }

    const discountAmount = coupon.calculateDiscount(totalAmount);
    const finalAmount = totalAmount - discountAmount;

    console.log('✅ Discount calculated successfully:', {
      discountAmount,
      finalAmount,
    });
    res.status(200).json({
      success: true,
      message: 'Discount calculated successfully',
      data: {
        couponCode: coupon.code,
        originalAmount: totalAmount,
        discountAmount,
        finalAmount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (err) {
    console.error('❌ Calculate discount error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new coupon
router.post('/coupons', async (req, res) => {
  try {
    console.log('🚀 Create coupon request:', req.body);
    const {
      code,
      discountType,
      discountValue,
      validFrom,
      validTill,
      usageLimit,
    } = req.body;

    // Input validation
    if (
      !code ||
      !discountType ||
      discountValue === undefined ||
      !validFrom ||
      !validTill
    ) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message:
          'Code, discount type, discount value, valid from, and valid till are required',
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discountType.toLowerCase())) {
      console.log('❌ Invalid discount type');
      return res.status(400).json({
        success: false,
        message: 'Discount type must be either "percentage" or "fixed"',
      });
    }

    // Validate discount value
    if (discountValue <= 0) {
      console.log('❌ Invalid discount value');
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than 0',
      });
    }

    if (discountType.toLowerCase() === 'percentage' && discountValue > 100) {
      console.log('❌ Invalid percentage value');
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot be more than 100',
      });
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const tillDate = new Date(validTill);

    if (fromDate >= tillDate) {
      console.log('❌ Invalid date range');
      return res.status(400).json({
        success: false,
        message: 'Valid till date must be after valid from date',
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      console.log('❌ Coupon code already exists:', code);
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    // Create new coupon
    const newCoupon = new Coupon({
      code: code.toUpperCase().trim(),
      discountType: discountType.toLowerCase(),
      discountValue: parseInt(discountValue),
      validFrom: fromDate,
      validTill: tillDate,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
    });

    const savedCoupon = await newCoupon.save();
    console.log('✅ Coupon created successfully:', savedCoupon.id);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: savedCoupon,
    });
  } catch (err) {
    console.error('❌ Create coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update coupon
router.put('/coupons/:id', async (req, res) => {
  try {
    console.log('🚀 Update coupon request:', req.params.id, req.body);
    const {
      code,
      discountType,
      discountValue,
      validFrom,
      validTill,
      usageLimit,
      isActive,
    } = req.body;

    const coupon = await Coupon.findOne({ id: req.params.id });
    if (!coupon) {
      console.log('❌ Coupon not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    // Update fields if provided
    if (code) {
      // Check if new code already exists (excluding current coupon)
      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
        id: { $ne: req.params.id },
      });
      if (existingCoupon) {
        return res.status(409).json({
          success: false,
          message: 'Coupon code already exists',
        });
      }
      coupon.code = code.toUpperCase().trim();
    }

    if (discountType) {
      if (!['percentage', 'fixed'].includes(discountType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Discount type must be either "percentage" or "fixed"',
        });
      }
      coupon.discountType = discountType.toLowerCase();
    }

    if (discountValue !== undefined) {
      if (discountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount value must be greater than 0',
        });
      }

      if (coupon.discountType === 'percentage' && discountValue > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount cannot be more than 100',
        });
      }

      coupon.discountValue = parseInt(discountValue);
    }

    if (validFrom) {
      const fromDate = new Date(validFrom);
      if (coupon.validTill && fromDate >= coupon.validTill) {
        return res.status(400).json({
          success: false,
          message: 'Valid from date must be before valid till date',
        });
      }
      coupon.validFrom = fromDate;
    }

    if (validTill) {
      const tillDate = new Date(validTill);
      if (tillDate <= coupon.validFrom) {
        return res.status(400).json({
          success: false,
          message: 'Valid till date must be after valid from date',
        });
      }
      coupon.validTill = tillDate;
    }

    if (usageLimit !== undefined) {
      coupon.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    }

    if (isActive !== undefined) {
      coupon.isActive = isActive;
    }

    const updatedCoupon = await coupon.save();
    console.log('✅ Coupon updated successfully:', updatedCoupon.id);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon,
    });
  } catch (err) {
    console.error('❌ Update coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete coupon (soft delete by setting isActive to false)
router.delete('/coupons/:id', async (req, res) => {
  try {
    console.log('🚀 Delete coupon request:', req.params.id);

    const coupon = await Coupon.findOne({ id: req.params.id });
    if (!coupon) {
      console.log('❌ Coupon not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    coupon.isActive = false;
    await coupon.save();

    console.log('✅ Coupon deactivated successfully:', coupon.id);
    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Use/Apply coupon (increment usage count)
router.post('/coupons/:id/use', async (req, res) => {
  try {
    console.log('🚀 Use coupon request:', req.params.id);

    const coupon = await Coupon.findOne({ id: req.params.id });
    if (!coupon) {
      console.log('❌ Coupon not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    if (!coupon.canBeUsed()) {
      console.log('❌ Coupon cannot be used:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'Coupon is expired, inactive, or usage limit exceeded',
      });
    }

    const updatedCoupon = await coupon.use();
    console.log('✅ Coupon used successfully:', updatedCoupon.id);

    res.status(200).json({
      success: true,
      message: 'Coupon used successfully',
      data: {
        id: updatedCoupon.id,
        code: updatedCoupon.code,
        usedCount: updatedCoupon.usedCount,
        remainingUses: updatedCoupon.usageLimit
          ? updatedCoupon.usageLimit - updatedCoupon.usedCount
          : null,
      },
    });
  } catch (err) {
    console.error('❌ Use coupon error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 PAYMENT ROUTES

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    console.log('🚀 Get all payments request');
    const payments = await Payment.find()
      .populate('order')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${payments.length} payments`);
    res.status(200).json({
      success: true,
      message: 'Payments fetched successfully',
      data: payments,
    });
  } catch (err) {
    console.error('❌ Get payments error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get payment by ID
router.get('/payments/:id', async (req, res) => {
  try {
    console.log('🚀 Get payment by ID request:', req.params.id);
    const payment = await Payment.findOne({ id: req.params.id }).populate(
      'order'
    );

    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    console.log('✅ Payment found:', payment.id);
    res.status(200).json({
      success: true,
      message: 'Payment fetched successfully',
      data: payment,
    });
  } catch (err) {
    console.error('❌ Get payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get payment by gateway payment ID
router.get('/payments/gateway/:gatewayPaymentId', async (req, res) => {
  try {
    console.log(
      '🚀 Get payment by gateway payment ID request:',
      req.params.gatewayPaymentId
    );
    const payment = await Payment.findByGatewayPaymentId(
      req.params.gatewayPaymentId
    ).populate('order');

    if (!payment) {
      console.log(
        '❌ Payment not found with gateway payment ID:',
        req.params.gatewayPaymentId
      );
      return res.status(404).json({
        success: false,
        message: 'Payment not found with this gateway payment ID',
      });
    }

    console.log('✅ Payment found by gateway payment ID:', payment.id);
    res.status(200).json({
      success: true,
      message: 'Payment fetched successfully',
      data: payment,
    });
  } catch (err) {
    console.error('❌ Get payment by gateway payment ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get payments by order ID
router.get('/payments/order/:orderId', async (req, res) => {
  try {
    console.log('🚀 Get payments by order ID request:', req.params.orderId);
    const payments = await Payment.findByOrderId(req.params.orderId).populate(
      'order'
    );

    console.log(
      `✅ Found ${payments.length} payments for order ${req.params.orderId}`
    );
    res.status(200).json({
      success: true,
      message: 'Order payments fetched successfully',
      data: payments,
    });
  } catch (err) {
    console.error('❌ Get payments by order ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get successful payments
router.get('/payments/status/successful', async (req, res) => {
  try {
    console.log('🚀 Get successful payments request');
    const payments = await Payment.findSuccessfulPayments().populate('order');

    console.log(`✅ Found ${payments.length} successful payments`);
    res.status(200).json({
      success: true,
      message: 'Successful payments fetched successfully',
      data: payments,
    });
  } catch (err) {
    console.error('❌ Get successful payments error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get failed payments
router.get('/payments/status/failed', async (req, res) => {
  try {
    console.log('🚀 Get failed payments request');
    const payments = await Payment.findFailedPayments().populate('order');

    console.log(`✅ Found ${payments.length} failed payments`);
    res.status(200).json({
      success: true,
      message: 'Failed payments fetched successfully',
      data: payments,
    });
  } catch (err) {
    console.error('❌ Get failed payments error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new payment
router.post('/payments', async (req, res) => {
  try {
    console.log('🚀 Create payment request:', req.body);
    const { gateway, gatewayPaymentId, orderId, amount, status, method } =
      req.body;

    // Input validation
    if (!gateway || !gatewayPaymentId || !orderId || amount === undefined) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message:
          'Gateway, Gateway Payment ID, Order ID, and Amount are required',
      });
    }

    // Validate amount
    if (amount < 0) {
      console.log('❌ Invalid amount');
      return res.status(400).json({
        success: false,
        message: 'Amount must be non-negative',
      });
    }

    // Check if Order exists (if Order model is available)
    if (Order) {
      const orderExists = await Order.findOne({ id: orderId });
      if (!orderExists) {
        console.log('❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
    }

    // Check if payment with same gateway payment ID already exists
    const existingPayment = await Payment.findByGatewayPaymentId(
      gatewayPaymentId
    );
    if (existingPayment) {
      console.log(
        '❌ Payment with this gateway payment ID already exists:',
        gatewayPaymentId
      );
      return res.status(409).json({
        success: false,
        message: 'Payment with this gateway payment ID already exists',
      });
    }

    // Validate status if provided
    if (
      status &&
      !['initiated', 'captured', 'failed', 'refunded'].includes(status)
    ) {
      console.log('❌ Invalid status');
      return res.status(400).json({
        success: false,
        message:
          'Invalid status. Must be one of: initiated, captured, failed, refunded',
      });
    }

    // Validate method if provided
    if (
      method &&
      !['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI'].includes(method)
    ) {
      console.log('❌ Invalid method');
      return res.status(400).json({
        success: false,
        message:
          'Invalid method. Must be one of: UPI, CARD, NETBANKING, WALLET, EMI',
      });
    }

    // Create new payment
    const newPayment = new Payment({
      gateway: gateway.trim(),
      gatewayPaymentId: gatewayPaymentId.trim(),
      orderId: parseInt(orderId),
      amount: parseInt(amount),
      status: status || 'initiated',
      method: method || null,
    });

    const savedPayment = await newPayment.save();

    // Populate order info for response
    await savedPayment.populate('order');

    console.log('✅ Payment created successfully:', savedPayment.id);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: savedPayment,
    });
  } catch (err) {
    console.error('❌ Create payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update payment
router.put('/payments/:id', async (req, res) => {
  try {
    console.log('🚀 Update payment request:', req.params.id, req.body);
    const { status, method, amount } = req.body;

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Update fields if provided
    if (status) {
      if (!['initiated', 'captured', 'failed', 'refunded'].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid status. Must be one of: initiated, captured, failed, refunded',
        });
      }
      payment.status = status;
    }

    if (method !== undefined) {
      if (
        method &&
        !['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI'].includes(method)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid method. Must be one of: UPI, CARD, NETBANKING, WALLET, EMI',
        });
      }
      payment.method = method;
    }

    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be non-negative',
        });
      }
      payment.amount = parseInt(amount);
    }

    const updatedPayment = await payment.save();
    await updatedPayment.populate('order');

    console.log('✅ Payment updated successfully:', updatedPayment.id);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment,
    });
  } catch (err) {
    console.error('❌ Update payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update payment status (common operation)
router.patch('/payments/:id/status', async (req, res) => {
  try {
    console.log('🚀 Update payment status request:', req.params.id, req.body);
    const { status } = req.body;

    if (!status) {
      console.log('❌ Status is required');
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    if (!['initiated', 'captured', 'failed', 'refunded'].includes(status)) {
      console.log('❌ Invalid status');
      return res.status(400).json({
        success: false,
        message:
          'Invalid status. Must be one of: initiated, captured, failed, refunded',
      });
    }

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    payment.status = status;
    const updatedPayment = await payment.save();
    await updatedPayment.populate('order');

    console.log('✅ Payment status updated successfully:', updatedPayment.id);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: updatedPayment,
    });
  } catch (err) {
    console.error('❌ Update payment status error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Capture payment (mark as successful)
router.post('/payments/:id/capture', async (req, res) => {
  try {
    console.log('🚀 Capture payment request:', req.params.id);

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'initiated') {
      console.log(
        '❌ Payment cannot be captured - invalid status:',
        payment.status
      );
      return res.status(400).json({
        success: false,
        message:
          'Payment cannot be captured. Current status: ' + payment.status,
      });
    }

    payment.status = 'captured';
    const updatedPayment = await payment.save();
    await updatedPayment.populate('order');

    console.log('✅ Payment captured successfully:', updatedPayment.id);

    res.status(200).json({
      success: true,
      message: 'Payment captured successfully',
      data: updatedPayment,
    });
  } catch (err) {
    console.error('❌ Capture payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Fail payment
router.post('/payments/:id/fail', async (req, res) => {
  try {
    console.log('🚀 Fail payment request:', req.params.id);

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'initiated') {
      console.log(
        '❌ Payment cannot be failed - invalid status:',
        payment.status
      );
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be failed. Current status: ' + payment.status,
      });
    }

    payment.status = 'failed';
    const updatedPayment = await payment.save();
    await updatedPayment.populate('order');

    console.log('✅ Payment marked as failed:', updatedPayment.id);

    res.status(200).json({
      success: true,
      message: 'Payment marked as failed',
      data: updatedPayment,
    });
  } catch (err) {
    console.error('❌ Fail payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Refund payment
router.post('/payments/:id/refund', async (req, res) => {
  try {
    console.log('🚀 Refund payment request:', req.params.id);

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'captured') {
      console.log(
        '❌ Payment cannot be refunded - invalid status:',
        payment.status
      );
      return res.status(400).json({
        success: false,
        message:
          'Only captured payments can be refunded. Current status: ' +
          payment.status,
      });
    }

    payment.status = 'refunded';
    const updatedPayment = await payment.save();
    await updatedPayment.populate('order');

    console.log('✅ Payment refunded successfully:', updatedPayment.id);

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: updatedPayment,
    });
  } catch (err) {
    console.error('❌ Refund payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete payment (hard delete - use with caution)
router.delete('/payments/:id', async (req, res) => {
  try {
    console.log('🚀 Delete payment request:', req.params.id);

    const payment = await Payment.findOne({ id: req.params.id });
    if (!payment) {
      console.log('❌ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    await Payment.deleteOne({ id: req.params.id });

    console.log('✅ Payment deleted successfully:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// 🟢 TESTIMONIAL ROUTES

// Get all testimonials
router.get('/testimonials', async (req, res) => {
  try {
    console.log('🚀 Get all testimonials request');
    const testimonials = await Testimonial.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${testimonials.length} testimonials`);
    res.status(200).json({
      success: true,
      message: 'Testimonials fetched successfully',
      data: testimonials,
    });
  } catch (err) {
    console.error('❌ Get testimonials error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get recent testimonials (for display on homepage)
router.get('/testimonials/recent', async (req, res) => {
  try {
    console.log('🚀 Get recent testimonials request');
    const limit = parseInt(req.query.limit) || 6;
    const testimonials = await Testimonial.getRecentTestimonials(limit);

    console.log(`✅ Found ${testimonials.length} recent testimonials`);
    res.status(200).json({
      success: true,
      message: 'Recent testimonials fetched successfully',
      data: testimonials,
    });
  } catch (err) {
    console.error('❌ Get recent testimonials error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get testimonials by rating
router.get('/testimonials/rating/:rating', async (req, res) => {
  try {
    console.log('🚀 Get testimonials by rating request:', req.params.rating);
    const rating = parseInt(req.params.rating);

    if (rating < 1 || rating > 5) {
      console.log('❌ Invalid rating value');
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const testimonials = await Testimonial.findByRating(rating)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(
      `✅ Found ${testimonials.length} testimonials with rating ${rating}`
    );
    res.status(200).json({
      success: true,
      message: `Testimonials with rating ${rating} fetched successfully`,
      data: testimonials,
    });
  } catch (err) {
    console.error('❌ Get testimonials by rating error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get testimonials by user ID
router.get('/testimonials/user/:userId', async (req, res) => {
  try {
    console.log('🚀 Get testimonials by user ID request:', req.params.userId);

    // Validate user exists
    const user = await Users.findById(req.params.userId);
    if (!user) {
      console.log('❌ User not found:', req.params.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const testimonials = await Testimonial.findByUser(req.params.userId)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(
      `✅ Found ${testimonials.length} testimonials for user ${req.params.userId}`
    );
    res.status(200).json({
      success: true,
      message: 'User testimonials fetched successfully',
      data: testimonials,
    });
  } catch (err) {
    console.error('❌ Get testimonials by user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Get testimonial by ID
router.get('/testimonials/:id', async (req, res) => {
  try {
    console.log('🚀 Get testimonial by ID request:', req.params.id);
    const testimonial = await Testimonial.findOne({
      id: req.params.id,
    }).populate('userId', 'name email');

    if (!testimonial) {
      console.log('❌ Testimonial not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    console.log('✅ Testimonial found:', testimonial.id);
    res.status(200).json({
      success: true,
      message: 'Testimonial fetched successfully',
      data: testimonial,
    });
  } catch (err) {
    console.error('❌ Get testimonial error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Create new testimonial
router.post('/testimonials', async (req, res) => {
  try {
    console.log('🚀 Create testimonial request:', req.body);
    const { userId, name, city, content, rating } = req.body;

    // Input validation
    if (!name || !content) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name and content are required',
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      console.log('❌ Name too short');
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long',
      });
    }

    // Validate content length
    if (content.trim().length < 10) {
      console.log('❌ Content too short');
      return res.status(400).json({
        success: false,
        message: 'Content must be at least 10 characters long',
      });
    }

    // Validate user exists if userId is provided
    if (userId) {
      const user = await Users.findById(userId);
      if (!user) {
        console.log('❌ User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        console.log('❌ Invalid rating value');
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5',
        });
      }
    }

    // Create new testimonial
    const newTestimonial = new Testimonial({
      userId: userId || null,
      name: name.trim(),
      city: city ? city.trim() : null,
      content: content.trim(),
      rating: rating || null,
    });

    const savedTestimonial = await newTestimonial.save();

    // Populate user info for response
    if (savedTestimonial.userId) {
      await savedTestimonial.populate('userId', 'name email');
    }

    console.log('✅ Testimonial created successfully:', savedTestimonial.id);

    res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      data: savedTestimonial,
    });
  } catch (err) {
    console.error('❌ Create testimonial error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Update testimonial
router.put('/testimonials/:id', async (req, res) => {
  try {
    console.log('🚀 Update testimonial request:', req.params.id, req.body);
    const { name, city, content, rating } = req.body;

    const testimonial = await Testimonial.findOne({ id: req.params.id });
    if (!testimonial) {
      console.log('❌ Testimonial not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    // Update fields if provided
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long',
        });
      }
      testimonial.name = name.trim();
    }

    if (city !== undefined) {
      testimonial.city = city ? city.trim() : null;
    }

    if (content !== undefined) {
      if (content.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Content must be at least 10 characters long',
        });
      }
      testimonial.content = content.trim();
    }

    if (rating !== undefined) {
      if (
        rating !== null &&
        (!Number.isInteger(rating) || rating < 1 || rating > 5)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5',
        });
      }
      testimonial.rating = rating;
    }

    const updatedTestimonial = await testimonial.save();

    // Populate user info for response
    if (updatedTestimonial.userId) {
      await updatedTestimonial.populate('userId', 'name email');
    }

    console.log('✅ Testimonial updated successfully:', updatedTestimonial.id);

    res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      data: updatedTestimonial,
    });
  } catch (err) {
    console.error('❌ Update testimonial error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

// Delete testimonial
router.delete('/testimonials/:id', async (req, res) => {
  try {
    console.log('🚀 Delete testimonial request:', req.params.id);

    const testimonial = await Testimonial.findOne({ id: req.params.id });
    if (!testimonial) {
      console.log('❌ Testimonial not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found',
      });
    }

    await Testimonial.deleteOne({ id: req.params.id });

    console.log('✅ Testimonial deleted successfully:', req.params.id);
    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully',
    });
  } catch (err) {
    console.error('❌ Delete testimonial error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message,
    });
  }
});

module.exports = router;
