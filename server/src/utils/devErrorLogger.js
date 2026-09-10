import crypto from 'crypto';
import DevLog from '../models/DevLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * devErrorLogger — Centralized developer error logging utility.
 *
 * DSA Design:
 * - Fingerprinting: errors are grouped by (errorType + route + httpStatus) → O(1) hash
 * - LRU Cache (Map-based, 128 entries): avoids DB hit for hot-path duplicate errors
 *   Each cache entry tracks the DevLog._id and timestamp for throttle check
 * - Throttle window: 5 minutes — same fingerprint within 5 min = increment, no new notification
 * - Occurrence counting: keeps one document per unique error type, not N documents
 * - Sanitization: recursively strips sensitive fields before storing context
 */

// --- LRU Cache for fingerprint dedup (O(1) access) ---
const CACHE_MAX_SIZE = 128;
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

class FingerprintLRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map(); // Map preserves insertion order for LRU eviction
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }
}

const fingerprintCache = new FingerprintLRUCache(CACHE_MAX_SIZE);

// --- Sensitive field sanitization ---
const SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'passwordHash', 'token', 'accesstoken', 'accessToken',
  'refreshtoken', 'refreshToken', 'secret', 'apikey', 'apiKey', 'api_key',
  'authorization', 'cookie', 'session', 'sessionid', 'sessionId',
  'creditcard', 'creditCard', 'cardnumber', 'cardNumber', 'cvv', 'ssn',
  'privatekey', 'privateKey', 'jwtSecret', 'jwt_secret',
]);

function sanitizeObject(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.slice(0, 10).map((item) => sanitizeObject(item, depth + 1));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, depth + 1);
    } else if (typeof value === 'string' && value.length > 500) {
      result[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Generates a stable fingerprint key for error deduplication.
 * O(1) hash from (errorType + route + httpStatus).
 */
function generateFingerprint(errorType, route, httpStatus) {
  const raw = `${errorType}:${route || 'unknown'}:${httpStatus || 0}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

/**
 * Classify error into an errorType and severity based on the error object.
 */
function classifyError(err, httpStatus) {
  const errName = err?.name || '';
  const errMsg = (err?.message || '').toLowerCase();

  // Database errors → Critical
  if (
    errName === 'MongoNetworkError' ||
    errName === 'MongoServerSelectionError' ||
    errName === 'MongooseServerSelectionError' ||
    errMsg.includes('econnrefused') ||
    errMsg.includes('connection refused') ||
    errMsg.includes('connect etimedout') ||
    errMsg.includes('database') && errMsg.includes('unavailable') ||
    errMsg.includes('topology was destroyed') ||
    httpStatus === 503
  ) {
    return { errorType: 'DatabaseError', severity: 'critical' };
  }

  // Auth errors
  if (httpStatus === 401 || httpStatus === 403) {
    return { errorType: 'AuthError', severity: 'warning' };
  }

  // Validation errors
  if (errName === 'ValidationError' || httpStatus === 422 || httpStatus === 400) {
    return { errorType: 'ValidationError', severity: 'warning' };
  }

  // 500 internal server errors
  if (httpStatus === 500 || !httpStatus) {
    return { errorType: 'ServerError', severity: 'error' };
  }

  // Network errors
  if (errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('enotfound')) {
    return { errorType: 'NetworkError', severity: 'error' };
  }

  return { errorType: 'APIError', severity: 'error' };
}

/**
 * Main entry point — log a developer error.
 *
 * @param {Object} options
 * @param {Error}  options.err        - The error object
 * @param {Object} [options.req]      - Express request object (optional)
 * @param {string} [options.errorType] - Override error type
 * @param {string} [options.severity]  - Override severity
 * @param {number} [options.httpStatus] - HTTP status code
 * @param {Object} [options.extraContext] - Additional context to store
 */
export async function logDevError({
  err,
  req = null,
  errorType: overrideType = null,
  severity: overrideSeverity = null,
  httpStatus: overrideHttpStatus = null,
  extraContext = null,
} = {}) {
  try {
    // Never log dev errors for frontend error POST itself (avoid recursion)
    if (req?.path?.includes('/dev/logs/frontend')) return;

    const httpStatus = overrideHttpStatus ?? (err?.statusCode || err?.status || null);
    const classified = classifyError(err, httpStatus);
    const errorType = overrideType || classified.errorType;
    const severity = overrideSeverity || classified.severity;

    // Extract route and method from request
    const route = req ? (req.originalUrl || req.url || null) : null;
    const method = req?.method?.toUpperCase() || null;

    // Safe user context (only role + id, no personal data)
    const userId = req?.user?._id || req?.user?.id || null;
    const userRole = req?.user?.role || null;

    // Stack trace (server-side only)
    const stackTrace = err?.stack
      ? err.stack.substring(0, 8000)
      : null;

    // Sanitized error message
    const message = (err?.message || 'Unknown error').substring(0, 2000);

    // Build fingerprint for deduplication
    const fingerprintKey = generateFingerprint(errorType, route, httpStatus);

    // --- Check LRU cache first (O(1)) ---
    const cached = fingerprintCache.get(fingerprintKey);
    const now = Date.now();

    if (cached && (now - cached.lastSeenAt) < THROTTLE_WINDOW_MS) {
      // Same error within throttle window → just increment occurrences
      await DevLog.updateOne(
        { _id: cached.docId },
        { $inc: { occurrences: 1 }, $set: { lastSeenAt: new Date() } }
      );
      // Update cache entry timestamp
      cached.lastSeenAt = now;
      fingerprintCache.set(fingerprintKey, cached);
      return; // No new notification for repeated error
    }

    // --- Check DB for recent duplicate (handles server restart cache miss) ---
    const recentWindow = new Date(now - THROTTLE_WINDOW_MS);
    const existingLog = await DevLog.findOne({
      fingerprintKey,
      lastSeenAt: { $gte: recentWindow },
    }).select('_id occurrences').lean();

    if (existingLog) {
      // Found in DB → increment
      await DevLog.updateOne(
        { _id: existingLog._id },
        { $inc: { occurrences: 1 }, $set: { lastSeenAt: new Date() } }
      );
      // Populate cache to avoid future DB hits
      fingerprintCache.set(fingerprintKey, { docId: existingLog._id, lastSeenAt: now });
      return; // No new notification
    }

    // --- New error: create DevLog ---
    const context = sanitizeObject({
      ...(extraContext || {}),
      ...(req?.query && Object.keys(req.query).length ? { query: sanitizeObject(req.query) } : {}),
      ...(req?.params && Object.keys(req.params).length ? { params: req.params } : {}),
    });

    const newLog = await DevLog.create({
      errorType,
      severity,
      message,
      httpStatus,
      route,
      method,
      userId,
      userRole,
      stackTrace,
      context: Object.keys(context).length ? context : null,
      fingerprintKey,
      occurrences: 1,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });

    // Update LRU cache
    fingerprintCache.set(fingerprintKey, { docId: newLog._id, lastSeenAt: now });

    // --- Create notifications for all dev users ---
    await createDevNotifications(newLog);

  } catch (loggingError) {
    // Never throw from error logger — just silently log to console
    console.error('[DevLogger] Failed to log dev error:', loggingError.message);
  }
}

/**
 * Creates a notification for all users with the 'dev' role.
 * Uses batch insert for efficiency.
 */
async function createDevNotifications(devLog) {
  try {
    const devUsers = await User.find({ role: 'dev' }).select('_id').lean();
    if (!devUsers.length) return;

    const severityEmoji = {
      critical: '🔴',
      error: '🟠',
      warning: '🟡',
    }[devLog.severity] || '⚪';

    const title = `${severityEmoji} New ${devLog.severity.toUpperCase()} Error`;
    const message = `${devLog.message}${devLog.route ? `\nRoute: ${devLog.route}` : ''}${devLog.httpStatus ? ` (${devLog.httpStatus})` : ''}`;

    const notifications = devUsers.map((u) => ({
      userId: u._id,
      title,
      message: message.substring(0, 500),
      type: 'dev_error',
      devLogId: devLog._id,
      severity: devLog.severity,
      route: devLog.route,
      isRead: false,
    }));

    // Bulk insert — O(n) where n = number of dev users
    await Notification.insertMany(notifications, { ordered: false });
  } catch (err) {
    console.error('[DevLogger] Failed to create dev notifications:', err.message);
  }
}

export default logDevError;
