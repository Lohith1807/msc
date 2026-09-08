import Card from '../models/Card.js';
import User from '../models/User.js';
import Response from '../models/Response.js';
import Log from '../models/Log.js';
import { recordLog } from '../utils/auditLogger.js';

// @route   GET /api/stats
// @desc    Get system-wide stats for Dashboard Home
export const getStats = async (req, res, next) => {
  try {
    const [totalCards, totalUsers, totalResponses] = await Promise.all([
      Card.countDocuments({ status: 'active' }),
      User.countDocuments(),
      Response.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalCards,
        totalUsers,
        totalResponses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/responses
// @desc    Get user responses with filters (cardId, userId, search, date range)
export const getResponses = async (req, res, next) => {
  try {
    const { cardId, userId, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (cardId && cardId !== 'undefined' && cardId !== '') filter.cardId = cardId;
    if (userId && userId !== 'undefined' && userId !== '') filter.userId = userId;

    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { userName: { $regex: search.trim(), $options: 'i' } },
        { cardName: { $regex: search.trim(), $options: 'i' } },
        { questionText: { $regex: search.trim(), $options: 'i' } },
        { answer: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const hasDateFrom = dateFrom && dateFrom !== 'undefined' && dateFrom !== '';
    const hasDateTo = dateTo && dateTo !== 'undefined' && dateTo !== '';

    if (hasDateFrom || hasDateTo) {
      filter.createdAt = {};
      if (hasDateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (hasDateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const responses = await Response.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: responses.length,
      responses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/responses
// @desc    Submit a user response to a card question
export const submitResponse = async (req, res, next) => {
  try {
    const {
      cardId,
      cardName,
      rotationAngle,
      rotation,
      rotationLabel,
      questionId,
      questionText,
      questionPrompt,
      answer,
    } = req.body;

    const qText = questionText || questionPrompt;
    const rot = rotationAngle !== undefined ? rotationAngle : (rotation !== undefined ? rotation : 0);

    if (!cardId || !qText || !answer) {
      return res.status(400).json({
        success: false,
        message: 'cardId, questionText, and answer are required',
      });
    }

    let finalCardName = cardName;
    if (!finalCardName) {
      const cardDoc = await Card.findById(cardId).catch(() => null);
      finalCardName = cardDoc?.name || 'Mind Lab Card';
    }

    const response = await Response.create({
      cardId,
      cardName: finalCardName,
      userId: req.user?._id || null,
      userName: req.user?.name || req.body.userName || 'MindLab Member',
      userEmail: req.user?.email || req.body.userEmail || '',
      rotationAngle: Number(rot) || 0,
      rotationLabel: rotationLabel || `Angle (${rot}°)`,
      questionId: questionId || '',
      questionText: qText,
      answer,
    });

    await recordLog({
      action: 'RESPONSE_SUBMITTED',
      details: `Response submitted for "${response.cardName}" (${response.rotationLabel}) by ${response.userName}: "${answer.slice(0, 40)}${answer.length > 40 ? '...' : ''}"`,
      category: 'Responses',
      user: req.user || { name: response.userName, role: 'user' },
      severity: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Response submitted successfully!',
      response,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users
// @desc    Get registered users with response counts
export const getUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role && role !== 'undefined' && role !== 'all' && role !== '') filter.role = role;
    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Aggregate response counts per user
    const responseCounts = await Response.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    responseCounts.forEach((r) => countMap.set(r._id.toString(), r.count));

    const enrichedUsers = users.map((u) => {
      const json = u.toJSON();
      json.responsesCount = countMap.get(u._id.toString()) || 0;
      return json;
    });

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users
// @desc    Create a new user account (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || 'user',
    });

    await recordLog({
      action: 'USER_CREATED_MANUALLY',
      details: `Administrator added user account "${user.name}" (${user.email}) with role [${user.role}].`,
      category: 'Security',
      user: req.user,
      severity: 'info',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/:id/role
// @desc    Update user role
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'psychiatrist', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, psychiatrist, or user',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await recordLog({
      action: 'USER_ROLE_CHANGED',
      details: `Role for "${user.name}" (${user.email}) changed from "${oldRole}" to "${role}".`,
      category: 'Security',
      user: req.user,
      severity: 'warning',
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users/:id
// @desc    Delete user account
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && user.email === 'lohithreddy1819@gmail.com') {
      return res.status(403).json({ success: false, message: 'Primary admin account cannot be deleted.' });
    }

    const userName = user.name;
    const userEmail = user.email;
    await User.findByIdAndDelete(req.params.id);

    await recordLog({
      action: 'USER_DELETED',
      details: `User account "${userName}" (${userEmail}) was deleted by administrator.`,
      category: 'Security',
      user: req.user,
      severity: 'danger',
    });

    res.status(200).json({
      success: true,
      message: `User ${userName} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/logs
// @desc    Get activity / audit logs
export const getLogs = async (req, res, next) => {
  try {
    const { category, severity, search } = req.query;
    const filter = {};

    if (category && category !== 'undefined' && category !== '') filter.category = category;
    if (severity && severity !== 'undefined' && severity !== '') filter.severity = severity;
    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { action: { $regex: search.trim(), $options: 'i' } },
        { details: { $regex: search.trim(), $options: 'i' } },
        { userName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const logs = await Log.find(filter)
      .sort({ createdAt: -1 })
      .limit(150);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
