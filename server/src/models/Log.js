import mongoose from 'mongoose';

const logSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    details: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'user',
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'success', 'danger'],
      default: 'info',
    },
    ip: {
      type: String,
      default: '127.0.0.1',
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

const Log = mongoose.model('Log', logSchema);

export default Log;
