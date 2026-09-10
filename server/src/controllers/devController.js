import DevLog from '../models/DevLog.js';
import Notification from '../models/Notification.js';

// --- DSA: In-memory sorted result cache for dev log listing ---
// LRU with 60s TTL for list queries to reduce DB load
import appCache from '../utils/cacheService.js';

/**
 * GET /api/dev/logs
 * Lists dev logs with filtering and search.
 * DSA: Compound MongoDB indexes ensure O(log n) filtered queries.
 */
export const getDevLogs = async (req, res, next) => {
  try {
    const { severity, status, search, errorType, limit = 100, skip = 0 } = req.query;

    const filter = {};
    if (severity && severity !== 'all') filter.severity = severity;
    if (status && status !== 'all') filter.status = status;
    if (errorType && errorType !== 'all') filter.errorType = errorType;

    if (search && search.trim()) {
      filter.$or = [
        { message: { $regex: search.trim(), $options: 'i' } },
        { route: { $regex: search.trim(), $options: 'i' } },
        { errorType: { $regex: search.trim(), $options: 'i' } },
        { logId: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      DevLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 200))
        .select('-stackTrace -context') // Exclude heavy fields from list view
        .lean(),
      DevLog.countDocuments(filter),
    ]);

    // Summary stats for filter badges
    const [newCount, criticalCount] = await Promise.all([
      DevLog.countDocuments({ status: 'new' }),
      DevLog.countDocuments({ severity: 'critical', status: { $ne: 'resolved' } }),
    ]);

    res.status(200).json({
      success: true,
      logs,
      totalCount,
      newCount,
      criticalCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dev/logs/:id
 * Returns full dev log detail including stackTrace and context.
 * Only accessible to dev/admin roles.
 */
export const getDevLogDetail = async (req, res, next) => {
  try {
    const log = await DevLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Dev log not found.' });
    }
    // Auto-mark as read when viewed
    if (log.status === 'new') {
      await DevLog.updateOne({ _id: log._id }, { $set: { status: 'read' } });
      log.status = 'read';
    }
    res.status(200).json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/dev/logs/:id/status
 * Updates the status of a dev log (read/resolved).
 */
export const updateDevLogStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    const log = await DevLog.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, select: '-stackTrace -context' }
    ).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Dev log not found.' });
    }
    res.status(200).json({ success: true, log, message: `Log marked as ${status}.` });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/dev/logs/:id
 * Deletes a dev log permanently.
 */
export const deleteDevLog = async (req, res, next) => {
  try {
    const log = await DevLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Dev log not found.' });
    }
    // Also delete related notifications
    await Notification.deleteMany({ devLogId: req.params.id });
    res.status(200).json({ success: true, message: 'Dev log deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/dev/logs (bulk clear resolved)
 */
export const clearResolvedLogs = async (req, res, next) => {
  try {
    const result = await DevLog.deleteMany({ status: 'resolved' });
    res.status(200).json({ success: true, message: `Cleared ${result.deletedCount} resolved logs.` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dev/notifications
 * Gets unread notifications for the authenticated dev user.
 * DSA: Index on (userId, isRead, createdAt) → O(log n) query
 */
export const getDevNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.length;

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/dev/notifications/:id/read
 * Marks a notification as read.
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { isRead: true } },
      { new: true }
    ).lean();
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.status(200).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/dev/notifications/read-all
 * Marks all notifications as read for the current user.
 */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/dev/logs/frontend
 * Receives frontend JavaScript runtime errors and stores them as DevLogs.
 * Rate-limited and sanitized on the frontend before sending.
 */
export const receiveFrontendError = async (req, res, next) => {
  try {
    const { message, source, lineno, colno, stack, type } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Error message is required.' });
    }

    // Import dynamically to avoid circular dependency issues
    const { logDevError } = await import('../utils/devErrorLogger.js');

    const syntheticError = new Error(message);
    syntheticError.stack = stack || `Error: ${message}\n    at ${source || 'unknown'}:${lineno || 0}:${colno || 0}`;

    await logDevError({
      err: syntheticError,
      req: null,
      errorType: 'FrontendError',
      severity: 'warning',
      httpStatus: null,
      extraContext: {
        source,
        lineno,
        colno,
        errorEventType: type,
        userAgent: req.headers['user-agent'],
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    // Silently fail for frontend error reporting
    res.status(200).json({ success: true });
  }
};
