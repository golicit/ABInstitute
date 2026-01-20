const Joi = require('joi');

// User validation schemas
const userRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required(),
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().trim(),
  email: Joi.string().email().optional().lowercase().trim(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .optional()
    .messages({
      'string.pattern.base':
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),
  role: Joi.string().valid('user', 'admin').optional(),
});

// Course validation schemas
const courseSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().trim(),
  description: Joi.string().min(10).max(2000).required().trim(),
  price: Joi.number().positive().required(),
  originalPrice: Joi.number().positive().required(),
  isActive: Joi.boolean().default(true),
  slug: Joi.string().optional(),
  category: Joi.string().optional(),
  duration: Joi.string().optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
});

// Order validation schemas
const orderSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),
  totalAmount: Joi.number().positive().required(),
  currency: Joi.string().valid('INR', 'USD').default('INR'),
  status: Joi.string()
    .valid('created', 'pending_payment', 'paid', 'failed', 'refunded')
    .default('created'),
  couponId: Joi.string().optional(),
  paymentId: Joi.string().optional(),
  userId: Joi.string().optional(),
});

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Validation middleware function
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: errorMessage,
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Validate URL parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter',
        error: errorMessage,
      });
    }

    next();
  };
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        error: errorMessage,
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  userRegistrationSchema,
  userLoginSchema,
  userUpdateSchema,
  courseSchema,
  orderSchema,
  objectIdSchema,
  forgotPasswordSchema,
};
