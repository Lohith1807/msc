import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { recordLog } from '../utils/auditLogger.js';

// Helper to generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'mindlab_super_secret_jwt_key_2026_understand_heal_grow';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, dob } = req.body;

    // Validate DOB
    if (!dob) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required.',
        errors: { dob: 'Date of birth is required.' },
      });
    }

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid date of birth.',
        errors: { dob: 'Please enter a valid date of birth.' },
      });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (birthDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth cannot be in the future.',
        errors: { dob: 'Date of birth cannot be in the future.' },
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await recordLog({
        action: 'REGISTER_FAILED',
        details: `Registration attempted with already existing email: "${email.toLowerCase()}".`,
        category: 'Auth',
        severity: 'warning',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      });
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: { email: 'An account with this email already exists' },
      });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user with dob
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      dob: birthDate,
    });

    // Generate token
    const token = generateToken(user._id);

    await recordLog({
      action: 'USER_REGISTERED',
      details: `New member "${user.name}" registered account (${user.email}).`,
      category: 'Auth',
      user: { _id: user._id, name: user.name, role: user.role },
      severity: 'success',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await recordLog({
        action: 'LOGIN_FAILED',
        details: `Failed login attempt for non-existent email: "${email.toLowerCase()}".`,
        category: 'Auth',
        severity: 'warning',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordLog({
        action: 'LOGIN_FAILED',
        details: `Failed login attempt (bad password) for user: "${user.name}" (${user.email}).`,
        category: 'Auth',
        severity: 'warning',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    await recordLog({
      action: 'USER_LOGIN',
      details: `User "${user.name}" (${user.email}) logged in successfully as [${user.role}].`,
      category: 'Auth',
      user: { _id: user._id, name: user.name, role: user.role },
      severity: 'info',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/logout
// @desc    Log out current user
// @access  Public / Optional Auth
export const logout = async (req, res) => {
  try {
    let currentUser = req.user;
    
    // Check Authorization header if req.user is not yet populated
    if (!currentUser && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token.startsWith('demo_token_')) {
          const role = token.replace('demo_token_', '');
          currentUser = await User.findOne({ role });
        } else {
          try {
            const secret = process.env.JWT_SECRET || 'mindlab_super_secret_jwt_key_2026_understand_heal_grow';
            const decoded = jwt.verify(token, secret);
            currentUser = await User.findById(decoded.id);
          } catch (e) {}
        }
      }
    }

    await recordLog({
      action: 'USER_LOGOUT',
      details: currentUser
        ? `User "${currentUser.name}" (${currentUser.email}) logged out.`
        : 'User logged out and session cleared.',
      category: 'Auth',
      user: currentUser || null,
      severity: 'info',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    return res.status(200).json({ success: true, message: 'Logged out.' });
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Generate password reset token
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    let devResetToken = null;

    if (user) {
      // Generate random reset token
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      // Hash token before storing in database for security
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawResetToken)
        .digest('hex');

      user.resetPasswordToken = hashedToken;
      // Expires in 1 hour
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
      await user.save();

      devResetToken = rawResetToken;

      console.log(`Password reset requested for ${user.email}`);
      console.log(`Reset Token: ${rawResetToken}`);
    }

    await recordLog({
      action: 'PASSWORD_RESET_REQUESTED',
      details: `Password reset requested for email: "${email.toLowerCase()}".`,
      category: 'Auth',
      user: user ? { _id: user._id, name: user.name, role: user.role } : null,
      severity: 'info',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    // Always return generic message to prevent account enumeration
    const responsePayload = {
      success: true,
      message:
        'If an account exists with that email address, you will receive password reset instructions.',
    };

    // Return reset token in development mode so manual and browser testing is seamless
    if (process.env.NODE_ENV !== 'production' && devResetToken) {
      responsePayload.devResetToken = devResetToken;
      responsePayload.resetUrl = `/reset-password/${devResetToken}`;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using valid token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token received to match stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      await recordLog({
        action: 'PASSWORD_RESET_FAILED',
        details: 'Attempted password reset with invalid or expired token.',
        category: 'Security',
        severity: 'warning',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      });
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    // Update password hash and clear reset fields
    user.passwordHash = await User.hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Issue fresh auth token
    const authToken = generateToken(user._id);

    await recordLog({
      action: 'PASSWORD_RESET_COMPLETED',
      details: `Password reset successfully completed for "${user.name}" (${user.email}).`,
      category: 'Security',
      user: { _id: user._id, name: user.name, role: user.role },
      severity: 'success',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You are now logged in.',
      token: authToken,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
};

// @route   PUT /api/auth/profile
// @desc    Update user profile information & password
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, dob, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (dob !== undefined) {
      if (!dob) {
        user.dob = null;
      } else {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid date of birth.',
          });
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (birthDate > today) {
          return res.status(400).json({
            success: false,
            message: 'Date of birth cannot be in the future.',
          });
        }
        user.dob = birthDate;
      }
    }

    let passwordChanged = false;
    // Password change check
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        await recordLog({
          action: 'PASSWORD_CHANGE_FAILED',
          details: `Failed password change attempt (wrong current password) for "${user.name}" (${user.email}).`,
          category: 'Security',
          user: { _id: user._id, name: user.name, role: user.role },
          severity: 'warning',
          ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        });
        return res.status(400).json({
          success: false,
          message: 'Current password does not match.',
        });
      }
      user.passwordHash = await User.hashPassword(newPassword);
      passwordChanged = true;
    }

    await user.save();

    await recordLog({
      action: 'PROFILE_UPDATED',
      details: `Profile updated for "${user.name}" (${user.email}): Name="${user.name}", Phone="${user.phone || 'None'}", Bio="${user.bio || 'None'}".`,
      category: 'Profile',
      user: { _id: user._id, name: user.name, role: user.role },
      severity: 'info',
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    });

    if (passwordChanged) {
      await recordLog({
        action: 'PASSWORD_CHANGED',
        details: `Account password changed for "${user.name}" (${user.email}).`,
        category: 'Security',
        user: { _id: user._id, name: user.name, role: user.role },
        severity: 'warning',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};
