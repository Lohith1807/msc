import mongoose from 'mongoose';

/**
 * Notification model — stores developer notifications for new errors.
 *
 * DSA: Compound index on (userId, isRead, createdAt) for O(log n) unread lookup.
 */
const notificationSchema = new mongoose.Schema(
  {
    // Target dev user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Notification category
    type: {
      type: String,
      enum: ['dev_error', 'system', 'info'],
      default: 'dev_error',
    },

    // Link to the DevLog that triggered this notification
    devLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DevLog',
      default: null,
    },

    // Severity of the associated error (for color coding in UI)
    severity: {
      type: String,
      enum: ['critical', 'error', 'warning', 'info'],
      default: 'error',
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Route where the error occurred (for quick context in notification)
    route: {
      type: String,
      default: null,
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

// DSA: Compound index for fast unread notification fetch per user
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
