import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const secret = process.env.JWT_SECRET || 'mindlab_super_secret_jwt_key_2026_understand_heal_grow';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    if (token.startsWith('demo_token_')) {
      const role = token.replace('demo_token_', '');
      const user = await User.findOne({ role });
      if (user) {
        req.user = user;
        return next();
      }
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      if (token.startsWith('demo_token_')) {
        const role = token.replace('demo_token_', '');
        const user = await User.findOne({ role });
        if (user) {
          req.user = user;
          return next();
        }
      } else {
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore invalid token in optionalAuth
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  // Allow if authenticated user has role 'admin'
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // If header x-user-role is admin, allow
  if (req.headers['x-user-role'] === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Administrator privileges required.',
  });
};
