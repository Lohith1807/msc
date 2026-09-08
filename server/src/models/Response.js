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

const Response = mongoose.model('Response', responseSchema);

export default Response;
