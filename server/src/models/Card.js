import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    rotation: {
      type: Number,
      required: true,
      enum: [0, 90, 180, 270],
      default: 0,
    },
    rotationLabel: {
      type: String,
      default: 'Front (0°)',
    },
    prompt: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['multiple_choice', 'scale_1_10', 'text_journal'],
      default: 'multiple_choice',
    },
    options: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true }
);

const cardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Card name is required'],
      trim: true,
      maxlength: [100, 'Card name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'Mindfulness',
    },
    levelBadge: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: '🧠',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    gradient: {
      type: String,
      default: 'linear-gradient(135deg, #1c3a52 0%, #2a9fb0 100%)',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
    questions: [questionSchema],
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

const Card = mongoose.model('Card', cardSchema);

export default Card;
