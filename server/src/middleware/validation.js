import { body, validationResult } from 'express-validator';

// Middleware to handle validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap = {};
    errors.array().forEach((err) => {
      // express-validator format may have err.path or err.param
      const field = err.path || err.param;
      if (!errorMap[field]) {
        errorMap[field] = err.msg;
      }
    });

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errorMap,
    });
  }
  next();
};

export const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Please enter your full name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email address')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Please enter a password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

export const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email address')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Please enter your password'),
];

export const forgotPasswordValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email address')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

export const resetPasswordValidationRules = [
  body('password')
    .notEmpty()
    .withMessage('Please enter a new password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];
