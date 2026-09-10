import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
    },
    cardName: {
      type: String,
      required: true,
      default: 'Mind Lab Card',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      required: true,
      default: 'Anonymous User',
    },
    userEmail: {
      type: String,
      default: '',
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    patientName: {
      type: String,
      default: '',
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    doctorName: {
      type: String,
      default: '',
    },
    rotationAngle: {
      type: Number,
      default: 0,
    },
    rotationLabel: {
      type: String,
      default: 'Front (0°)',
    },
    questionId: {
      type: String,
      default: '',
    },
    questionText: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
    },
    evaluationType: {
      type: String,
      enum: ['manual', 'ai', 'none'],
      default: 'none',
    },
    evaluation: {
      type: String,
      default: '',
    },
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    evaluatorName: {
      type: String,
      default: '',
    },
    evaluatedAt: {
      type: Date,
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

// High-Performance B-Tree Compound Indexes for fast retrieval
responseSchema.index({ doctorId: 1, createdAt: -1 });
responseSchema.index({ patientId: 1, createdAt: -1 });
responseSchema.index({ userId: 1, createdAt: -1 });
responseSchema.index({ evaluatorId: 1, createdAt: -1 });
responseSchema.index({ doctorId: 1, patientId: 1 });
responseSchema.index({ doctorId: 1, userId: 1 });

const Response = mongoose.model('Response', responseSchema);

export default Response;
