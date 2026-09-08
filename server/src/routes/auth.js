import express from 'express';
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
} from '../controllers/authController.js';
import {
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  validate,
} from '../middleware/validation.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/register',
  registerValidationRules,
  validate,
  register
);

router.post(
  '/login',
  authRateLimiter,
  loginValidationRules,
  validate,
  login
);

router.post('/logout', logout);

router.post(
  '/forgot-password',
  authRateLimiter,
  forgotPasswordValidationRules,
  validate,
  forgotPassword
);

router.post(
  '/reset-password/:token',
  resetPasswordValidationRules,
  validate,
  resetPassword
);

router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

export default router;
