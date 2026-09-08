import Card from '../models/Card.js';
import { recordLog } from '../utils/auditLogger.js';

// Helper to resolve rotation label
const getRotationLabel = (rotation) => {
  switch (Number(rotation)) {
    case 90:
      return 'Right (90°)';
    case 180:
      return 'Back / Inverted (180°)';
    case 270:
      return 'Left (270°)';
    default:
      return 'Front (0°)';
  }
};

// @route   GET /api/cards
// @desc    Get all active cards (or all if admin / query param all=true)
export const getCards = async (req, res, next) => {
  try {
    // If all=true is passed (by Admin Manage Cards), return all cards (active + inactive).
    // Otherwise, return only active cards (for Home page and end-users).
    const showAll = req.query.all === 'true';

    const filter = showAll ? {} : { status: 'active' };
    const cards = await Card.find(filter).sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/cards/:id
// @desc    Get single card by ID
export const getCardById = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    res.status(200).json({ success: true, card });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/cards
// @desc    Create a new card (Admin)
export const createCard = async (req, res, next) => {
  try {
    const {
      name,
      category,
      levelBadge,
      icon,
      imageUrl,
      gradient,
      description,
      status,
      questions,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Card name is required' });
    }

    const processedQuestions = (questions || []).map((q, idx) => ({
      rotation: Number(q.rotation) || 0,
      rotationLabel: q.rotationLabel || getRotationLabel(q.rotation),
      prompt: q.prompt || 'Question prompt',
      questionType: q.questionType || 'multiple_choice',
      options: q.options || [],
      order: q.order !== undefined ? q.order : idx,
    }));

    const cardCount = await Card.countDocuments();

    const card = await Card.create({
      name,
      category: category || 'Mindfulness',
      levelBadge: levelBadge || '',
      icon: icon || '🧠',
      imageUrl: imageUrl || '',
      gradient: gradient || 'linear-gradient(135deg, #1c3a52 0%, #2a9fb0 100%)',
      description: description || '',
      status: status || 'active',
      order: cardCount,
      questions: processedQuestions,
    });

    await recordLog({
      action: 'CARD_CREATED',
      details: `Card "${card.name}" created with ${card.questions.length} questions.`,
      category: 'Cards',
      user: req.user,
      severity: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/cards/:id
// @desc    Update a card
export const updateCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const {
      name,
      category,
      levelBadge,
      icon,
      imageUrl,
      gradient,
      description,
      status,
      order,
      questions,
    } = req.body;

    const oldStatus = card.status;

    if (name !== undefined) card.name = name;
    if (category !== undefined) card.category = category;
    if (levelBadge !== undefined) card.levelBadge = levelBadge;
    if (icon !== undefined) card.icon = icon;
    if (imageUrl !== undefined) card.imageUrl = imageUrl;
    if (gradient !== undefined) card.gradient = gradient;
    if (description !== undefined) card.description = description;
    if (status !== undefined) card.status = status;
    if (order !== undefined) card.order = order;

    if (questions !== undefined) {
      card.questions = questions.map((q, idx) => ({
        rotation: Number(q.rotation) || 0,
        rotationLabel: q.rotationLabel || getRotationLabel(q.rotation),
        prompt: q.prompt,
        questionType: q.questionType || 'multiple_choice',
        options: q.options || [],
        order: q.order !== undefined ? q.order : idx,
      }));
    }

    await card.save();

    if (status !== undefined && status !== oldStatus) {
      await recordLog({
        action: 'CARD_STATUS_CHANGED',
        details: `Card "${card.name}" status changed from "${oldStatus}" to "${card.status}".`,
        category: 'Cards',
        user: req.user,
        severity: 'warning',
      });
    }

    await recordLog({
      action: 'CARD_UPDATED',
      details: `Card "${card.name}" updated (Category: "${card.category}", Status: "${card.status}").`,
      category: 'Cards',
      user: req.user,
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Card updated successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/cards/:id
// @desc    Delete a card
export const deleteCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const cardName = card.name;
    await Card.findByIdAndDelete(req.params.id);

    await recordLog({
      action: 'CARD_DELETED',
      details: `Card "${cardName}" (ID: ${req.params.id}) was permanently deleted.`,
      category: 'Cards',
      user: req.user,
      severity: 'danger',
    });

    res.status(200).json({
      success: true,
      message: `Card "${cardName}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/cards/:id/questions
// @desc    Add a question mapped to a rotation state
export const addQuestion = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const { rotation, prompt, questionType, options } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Question prompt is required' });
    }

    const rotNum = Number(rotation) || 0;
    const newQuestion = {
      rotation: rotNum,
      rotationLabel: getRotationLabel(rotNum),
      prompt,
      questionType: questionType || 'multiple_choice',
      options: options || [],
      order: card.questions.length,
    };

    card.questions.push(newQuestion);
    await card.save();

    await recordLog({
      action: 'QUESTION_MAPPED',
      details: `Added question mapped to ${newQuestion.rotationLabel} on "${card.name}".`,
      category: 'Questions',
      user: req.user,
      severity: 'info',
    });

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/cards/:id/questions/:qId
// @desc    Update a specific question
export const updateQuestion = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const q = card.questions.id(req.params.qId);
    if (!q) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const { rotation, prompt, questionType, options, order } = req.body;
    if (rotation !== undefined) {
      q.rotation = Number(rotation);
      q.rotationLabel = getRotationLabel(Number(rotation));
    }
    if (prompt !== undefined) q.prompt = prompt;
    if (questionType !== undefined) q.questionType = questionType;
    if (options !== undefined) q.options = options;
    if (order !== undefined) q.order = order;

    await card.save();

    await recordLog({
      action: 'QUESTION_UPDATED',
      details: `Updated question on "${card.name}" (Mapped: ${q.rotationLabel}).`,
      category: 'Questions',
      user: req.user,
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/cards/:id/questions/:qId
// @desc    Delete question from card
export const deleteQuestion = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    card.questions = card.questions.filter((q) => q._id.toString() !== req.params.qId);
    await card.save();

    await recordLog({
      action: 'QUESTION_DELETED',
      details: `Deleted question from "${card.name}".`,
      category: 'Questions',
      user: req.user,
      severity: 'warning',
    });

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/cards/:id/questions/reorder
// @desc    Reorder questions within a card
export const reorderQuestions = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const { questionIds } = req.body; // Array of question IDs in new order
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, message: 'questionIds must be an array' });
    }

    const qMap = new Map();
    card.questions.forEach((q) => qMap.set(q._id.toString(), q));

    const reordered = [];
    questionIds.forEach((id, idx) => {
      const q = qMap.get(id);
      if (q) {
        q.order = idx;
        reordered.push(q);
      }
    });

    // Add any missing ones
    card.questions.forEach((q) => {
      if (!questionIds.includes(q._id.toString())) {
        q.order = reordered.length;
        reordered.push(q);
      }
    });

    card.questions = reordered;
    await card.save();

    await recordLog({
      action: 'QUESTIONS_REORDERED',
      details: `Reordered questions on card "${card.name}".`,
      category: 'Questions',
      user: req.user,
      severity: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Questions reordered successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
};
