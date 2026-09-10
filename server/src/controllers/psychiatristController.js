import mongoose from 'mongoose';
import Card from '../models/Card.js';
import User from '../models/User.js';
import Response from '../models/Response.js';
import appCache from '../utils/cacheService.js';

/**
 * Helper to get the authenticated psychiatrist ID from req.user
 */
const getPsychiatristId = (req) => {
  if (req.user && req.user._id) return req.user._id;
  if (req.headers['x-user-id']) {
    try {
      return new mongoose.Types.ObjectId(req.headers['x-user-id']);
    } catch (_) {}
  }
  return null;
};

// @route   GET /api/psychiatrist/stats
// @desc    Get psychiatrist-specific stats for Home Dashboard
//          Box 1: Total Cards (active cards in system)
//          Box 2: My Total Patients (unique patients of this psychiatrist)
//          Box 3: My Patient Total Responses (all responses belonging to this psychiatrist)
export const getPsychiatristStats = async (req, res, next) => {
  try {
    const psychiatristId = getPsychiatristId(req);
    if (!psychiatristId) {
      return res.status(401).json({
        success: false,
        message: 'Psychiatrist authentication required.',
      });
    }

    // High-Performance In-Memory Cache Check: O(1) amortized retrieval
    const cacheKey = `psychiatrist:stats:${psychiatristId.toString()}`;
    const cachedStats = appCache.get(cacheKey);
    if (cachedStats) {
      return res.status(200).json({
        success: true,
        stats: cachedStats,
        fromCache: true,
      });
    }

    // 1. Total Cards: Active Deck Cards (Index scan: status = 'active')
    const totalCards = await Card.countDocuments({ status: 'active' });

    // 2. My Total Patients: Unique patients who have consulted or are linked with this psychiatrist
    const [respPatientIds, respUserIds, doctorPatientIds] = await Promise.all([
      Response.distinct('patientId', {
        $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
      }),
      Response.distinct('userId', {
        $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
      }),
      User.find({
        role: 'user',
        doctors: psychiatristId,
      }).distinct('_id'),
    ]);

    const allPatientIdStrs = new Set([
      ...respPatientIds.filter(Boolean).map((id) => id.toString()),
      ...respUserIds.filter(Boolean).map((id) => id.toString()),
      ...doctorPatientIds.filter(Boolean).map((id) => id.toString()),
    ]);

    // Ensure they are actually users/patients
    let myTotalPatients = 0;
    if (allPatientIdStrs.size > 0) {
      const validIds = Array.from(allPatientIdStrs)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        myTotalPatients = await User.countDocuments({
          _id: { $in: validIds },
          role: 'user',
        });
      }
    }

    // 3. My Patient Total Responses: Total responses belonging to this psychiatrist's consultations
    const myPatientTotalResponses = await Response.countDocuments({
      $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
    });

    const statsData = {
      totalCards,
      myTotalPatients,
      myPatientTotalResponses,
    };

    // Store in O(1) In-Memory Cache with a 30-second TTL
    appCache.set(cacheKey, statsData, 30 * 1000);

    res.status(200).json({
      success: true,
      stats: statsData,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/psychiatrist/patients
// @desc    Get patients list who have consulted/interacted with the currently logged-in Psychiatrist
export const getPsychiatristPatients = async (req, res, next) => {
  try {
    const psychiatristId = getPsychiatristId(req);
    if (!psychiatristId) {
      return res.status(401).json({
        success: false,
        message: 'Psychiatrist authentication required.',
      });
    }

    const { search, q } = req.query;
    const queryStr = (search || q || '').trim();

    // Find all patient IDs associated with this psychiatrist
    const [respPatientIds, respUserIds, doctorPatientIds] = await Promise.all([
      Response.distinct('patientId', {
        $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
      }),
      Response.distinct('userId', {
        $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
      }),
      User.find({
        role: 'user',
        doctors: psychiatristId,
      }).distinct('_id'),
    ]);

    const allPatientIdStrs = new Set([
      ...respPatientIds.filter(Boolean).map((id) => id.toString()),
      ...respUserIds.filter(Boolean).map((id) => id.toString()),
      ...doctorPatientIds.filter(Boolean).map((id) => id.toString()),
    ]);

    if (allPatientIdStrs.size === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        patients: [],
      });
    }

    const validIds = Array.from(allPatientIdStrs)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        patients: [],
      });
    }

    const filter = {
      _id: { $in: validIds },
      role: 'user',
    };

    if (queryStr) {
      filter.$or = [
        { name: { $regex: queryStr, $options: 'i' } },
        { email: { $regex: queryStr, $options: 'i' } },
        { phone: { $regex: queryStr, $options: 'i' } },
      ];
    }

    const patients = await User.find(filter)
      .select('name email phone age bio createdAt')
      .sort({ createdAt: -1 });

    // High-Performance Algorithmic Optimization (DSA):
    // Replace O(N * 2) iterative DB queries with a single MongoDB Aggregation Pipeline ($group + $first)
    // and an in-memory Hash Map (O(1) amortized lookup).
    const patientObjectIds = patients.map((p) => p._id);
    const statsMap = new Map();

    if (patientObjectIds.length > 0) {
      const patientStatsAgg = await Response.aggregate([
        {
          $match: {
            $and: [
              {
                $or: [
                  { patientId: { $in: patientObjectIds } },
                  { userId: { $in: patientObjectIds } },
                ],
              },
              {
                $or: [
                  { doctorId: psychiatristId },
                  { evaluatorId: psychiatristId },
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            matchedPatientId: {
              $cond: [
                { $in: ['$patientId', patientObjectIds] },
                '$patientId',
                '$userId',
              ],
            },
            createdAt: 1,
            cardName: 1,
          },
        },
        {
          $group: {
            _id: '$matchedPatientId',
            consultationCount: { $sum: 1 },
            lastConsultationDate: { $first: '$createdAt' },
            lastCardName: { $first: '$cardName' },
          },
        },
      ]);

      // Populate Hash Map in O(M) time for O(1) lookups
      for (const item of patientStatsAgg) {
        if (item._id) {
          statsMap.set(item._id.toString(), item);
        }
      }
    }

    // Linear O(N) mapping with O(1) Hash Map access
    const patientCards = patients.map((patient) => {
      const stats = statsMap.get(patient._id.toString());
      return {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || '',
        age: patient.age || null,
        bio: patient.bio || '',
        consultationCount: stats ? stats.consultationCount : 0,
        lastConsultationDate: stats ? stats.lastConsultationDate : null,
        lastCardName: stats ? stats.lastCardName : '',
        createdAt: patient.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: patientCards.length,
      patients: patientCards,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/psychiatrist/patients/:patientId
// @desc    Get dedicated patient details and consultation history with this psychiatrist
export const getPatientDetails = async (req, res, next) => {
  try {
    const psychiatristId = getPsychiatristId(req);
    if (!psychiatristId) {
      return res.status(401).json({
        success: false,
        message: 'Psychiatrist authentication required.',
      });
    }

    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format.',
      });
    }

    const patient = await User.findOne({ _id: patientId, role: 'user' }).select(
      'name email phone age bio doctors createdAt'
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // Security check: Verify that this patient belongs to or has consulted with this psychiatrist
    const isLinkedDoctor =
      patient.doctors &&
      patient.doctors.some((d) => d.toString() === psychiatristId.toString());

    const hasConsultation = await Response.exists({
      $and: [
        { $or: [{ patientId: patient._id }, { userId: patient._id }] },
        { $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }] },
      ],
    });

    const isSystemAdmin = req.user && req.user.role === 'admin';

    if (!isLinkedDoctor && !hasConsultation && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view details for your own patients.',
      });
    }

    // Retrieve consultation history with this psychiatrist
    const consultationsQuery = {
      $and: [
        { $or: [{ patientId: patient._id }, { userId: patient._id }] },
      ],
    };

    if (!isSystemAdmin) {
      consultationsQuery.$and.push({
        $or: [{ doctorId: psychiatristId }, { evaluatorId: psychiatristId }],
      });
    }

    const responses = await Response.find(consultationsQuery)
      .sort({ createdAt: -1 })
      .select(
        'cardId cardName questionId questionText rotationAngle rotationLabel answer evaluation evaluationType evaluatedAt evaluatorName createdAt'
      );

    const consultationList = responses.map((r, index) => {
      const parsedDate = r.createdAt ? new Date(r.createdAt) : new Date();
      const d = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();

      return {
        id: r._id,
        _id: r._id,
        sNo: index + 1,
        dateFormatted: `${day} ${month} ${year}`,
        dateShort: `${day} ${month}`,
        createdAt: r.createdAt,
        cardId: r.cardId,
        cardName: r.cardName || 'Assessment Card',
        questionText: r.questionText,
        answer: r.answer,
        evaluation: r.evaluation || '',
        evaluationType: r.evaluationType || 'none',
        hasEvaluation: Boolean(r.evaluation && r.evaluation.trim()),
      };
    });

    res.status(200).json({
      success: true,
      patient: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || '',
        age: patient.age || null,
        bio: patient.bio || '',
        createdAt: patient.createdAt,
      },
      consultations: consultationList,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/psychiatrist/consultations/:consultationId
// @desc    Get complete consultation details (Card, Question, Patient Response, Psychiatrist Evaluation)
export const getConsultationDetails = async (req, res, next) => {
  try {
    const psychiatristId = getPsychiatristId(req);
    if (!psychiatristId) {
      return res.status(401).json({
        success: false,
        message: 'Psychiatrist authentication required.',
      });
    }

    const { consultationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(consultationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultation ID format.',
      });
    }

    const response = await Response.findById(consultationId);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found.',
      });
    }

    // Security check: Must belong to this psychiatrist or admin
    const isDoctor =
      (response.doctorId && response.doctorId.toString() === psychiatristId.toString()) ||
      (response.evaluatorId && response.evaluatorId.toString() === psychiatristId.toString());
    const isSystemAdmin = req.user && req.user.role === 'admin';

    if (!isDoctor && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view consultations associated with your account.',
      });
    }

    // Retrieve patient record for up-to-date phone/age
    let patientData = null;
    const targetPatientId = response.patientId || response.userId;
    if (targetPatientId && mongoose.Types.ObjectId.isValid(targetPatientId)) {
      patientData = await User.findById(targetPatientId).select('name email phone age bio');
    }

    // Retrieve card details (optional icon/gradient)
    let cardData = null;
    if (response.cardId && mongoose.Types.ObjectId.isValid(response.cardId)) {
      cardData = await Card.findById(response.cardId).select('name gradient imageUrl');
    }

    const parsedDate = response.createdAt ? new Date(response.createdAt) : new Date();
    const d = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    res.status(200).json({
      success: true,
      consultation: {
        id: response._id,
        _id: response._id,
        // 1. Consultation Information
        patientId: targetPatientId,
        patientName: patientData?.name || response.patientName || response.userName || 'Patient',
        patientEmail: patientData?.email || response.userEmail || '',
        patientPhone: patientData?.phone || '',
        patientAge: patientData?.age || null,
        consultationDateFormatted: `${day} ${month} ${year}, ${time}`,
        consultationDateShort: `${day} ${month} ${year}`,
        createdAt: response.createdAt,
        cardId: response.cardId,
        cardName: response.cardName || cardData?.name || 'Assessment Card',
        cardGradient: cardData?.gradient || null,
        cardImageUrl: cardData?.imageUrl || null,
        rotationAngle: response.rotationAngle ?? 0,
        rotationLabel: response.rotationLabel || `Angle (${response.rotationAngle ?? 0}°)`,

        // 2. Question
        questionId: response.questionId || '',
        questionText: response.questionText,

        // 3. Patient Response
        patientResponse: response.answer,

        // 4. Psychiatrist Evaluation
        evaluation: response.evaluation || '',
        evaluationType: response.evaluationType || 'manual',
        evaluatedAt: response.evaluatedAt,
        evaluatorId: response.evaluatorId || response.doctorId,
        evaluatorName: response.evaluatorName || response.doctorName || 'Psychiatrist',
      },
    });
  } catch (error) {
    next(error);
  }
};
