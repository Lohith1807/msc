import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * DevLog — Stores automatically-captured application errors for developer review.
 *
 * DSA: Compound indexes on (severity, status, createdAt) enable O(log n) filtered queries.
 *      fingerprintKey index enables O(1) deduplication lookup.
 *
 * Deduplication: identical errors (same route + errorType + httpStatus) are grouped
 * by incrementing `occurrences` instead of creating duplicate documents.
 */
const devLogSchema = new mongoose.Schema(
  {
    // Human-readable short ID for display in UI
    logId: {
      type: String,
      default: () => crypto.randomUUID().split('-')[0].toUpperCase(),
      index: true,
    },

    // Error classification
    errorType: {
      type: String,
      required: true,
      enum: [
        'DatabaseError',
        'ServerError',
        'AuthError',
        'APIError',
        'ValidationError',
        'FrontendError',
        'NetworkError',
        'UnhandledError',
      ],
      default: 'ServerError',
    },

    // Severity level
    severity: {
      type: String,
      enum: ['critical', 'error', 'warning'],
      required: true,
      default: 'error',
    },

    // Sanitized error message (no passwords/tokens)
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Workflow status for dev tracking
    status: {
      type: String,
      enum: ['new', 'read', 'resolved'],
      default: 'new',
    },

    // HTTP context (may be null for non-HTTP errors)
    httpStatus: {
      type: Number,
      default: null,
    },
    route: {
      type: String,
      default: null,
      trim: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', null],
      default: null,
    },

    // Safe user reference (no personal data stored here)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userRole: {
      type: String,
      default: null,
    },

    // Stack trace (server-side only, NEVER sent to non-dev users)
    stackTrace: {
      type: String,
      default: null,
      maxlength: 10000,
    },

    // Additional context (sanitized — no passwords/tokens/secrets)
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Deduplication fingerprint: hash of (errorType + route + httpStatus)
    // Enables O(1) lookup to group repeated identical errors
    fingerprintKey: {
      type: String,
      required: true,
      index: true,
    },

    // Occurrence tracking for grouped/repeated errors
    occurrences: {
      type: Number,
      default: 1,
      min: 1,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// --- DSA: Compound Indexes for O(log n) filtered queries ---
devLogSchema.index({ severity: 1, status: 1, createdAt: -1 });
devLogSchema.index({ status: 1, createdAt: -1 });
devLogSchema.index({ errorType: 1, status: 1 });
devLogSchema.index({ createdAt: -1 });

const DevLog = mongoose.model('DevLog', devLogSchema);

export default DevLog;
