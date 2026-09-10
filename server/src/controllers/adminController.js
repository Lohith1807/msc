import Card from '../models/Card.js';
import User from '../models/User.js';
import Response from '../models/Response.js';
import Log from '../models/Log.js';
import { recordLog } from '../utils/auditLogger.js';
import appCache from '../utils/cacheService.js';

// @route   GET /api/stats
// @desc    Get system-wide stats for Dashboard Home
export const getStats = async (req, res, next) => {
  try {
    const cached = appCache.get('admin:stats');
    if (cached) {
      return res.status(200).json({
        success: true,
        stats: cached,
        fromCache: true,
      });
    }

    const [totalCards, totalUsers, totalResponses] = await Promise.all([
      Card.countDocuments({ status: 'active' }),
      User.countDocuments(),
      Response.countDocuments(),
    ]);

    const statsData = {
      totalCards,
      totalUsers,
      totalResponses,
    };

    appCache.set('admin:stats', statsData, 30 * 1000);

    res.status(200).json({
      success: true,
      stats: statsData,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/responses
// @desc    Get user responses with filters (cardId, userId, search, date range)
export const getResponses = async (req, res, next) => {
  try {
    const { cardId, userId, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (cardId && cardId !== 'undefined' && cardId !== '') filter.cardId = cardId;
    if (userId && userId !== 'undefined' && userId !== '') filter.userId = userId;

    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { userName: { $regex: search.trim(), $options: 'i' } },
        { cardName: { $regex: search.trim(), $options: 'i' } },
        { questionText: { $regex: search.trim(), $options: 'i' } },
        { answer: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const hasDateFrom = dateFrom && dateFrom !== 'undefined' && dateFrom !== '';
    const hasDateTo = dateTo && dateTo !== 'undefined' && dateTo !== '';

    if (hasDateFrom || hasDateTo) {
      filter.createdAt = {};
      if (hasDateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (hasDateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const responses = await Response.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: responses.length,
      responses,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/responses
// @desc    Submit a user response to a card question
export const submitResponse = async (req, res, next) => {
  try {
    const {
      cardId,
      cardName,
      rotationAngle,
      rotation,
      rotationLabel,
      questionId,
      questionText,
      questionPrompt,
      answer,
    } = req.body;

    const qText = questionText || questionPrompt;
    const rot = rotationAngle !== undefined ? rotationAngle : (rotation !== undefined ? rotation : 0);

    if (!cardId || !qText || !answer) {
      return res.status(400).json({
        success: false,
        message: 'cardId, questionText, and answer are required',
      });
    }

    let finalCardName = cardName;
    if (!finalCardName) {
      const cardDoc = await Card.findById(cardId).catch(() => null);
      finalCardName = cardDoc?.name || 'Mind Lab Card';
    }

    const patientId = req.body.patientId || req.body.userId || null;
    const patientName = req.body.patientName || req.body.userName || (req.user?.name || 'MindLab Member');
    const patientEmail = req.body.patientEmail || req.body.userEmail || (req.user?.email || '');
    const doctorId = req.user?._id || req.body.doctorId || null;
    const doctorName = req.user?.name || req.body.doctorName || '';

    const response = await Response.create({
      cardId,
      cardName: finalCardName,
      userId: patientId,
      userName: patientName,
      userEmail: patientEmail,
      patientId,
      patientName,
      doctorId,
      doctorName,
      rotationAngle: Number(rot) || 0,
      rotationLabel: rotationLabel || `Angle (${rot}°)`,
      questionId: questionId || '',
      questionText: qText,
      answer,
    });

    // Ensure patient document is linked to this doctor
    if (doctorId && patientId) {
      try {
        const patientDoc = await User.findById(patientId);
        if (patientDoc) {
          if (!patientDoc.doctors) patientDoc.doctors = [];
          const docStr = doctorId.toString();
          if (!patientDoc.doctors.some((d) => d.toString() === docStr)) {
            patientDoc.doctors.push(doctorId);
            await patientDoc.save();
          }
        }
      } catch (_) {}
    }

    await recordLog({
      action: 'RESPONSE_SUBMITTED',
      details: `Response submitted for "${response.cardName}" (${response.rotationLabel}) by patient ${patientName}${doctorName ? ` with Dr. ${doctorName}` : ''}: "${answer.slice(0, 40)}${answer.length > 40 ? '...' : ''}"`,
      category: 'Responses',
      user: req.user || { name: patientName, role: 'user' },
      severity: 'success',
    });

    // Invalidate cached statistics on new response submission
    appCache.invalidatePrefix('admin:stats');
    appCache.invalidatePrefix('psychiatrist:');

    res.status(201).json({
      success: true,
      message: 'Response submitted successfully!',
      response,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/responses/:id/evaluation
// @desc    Save evaluation (manual or AI) for a response
export const evaluateResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { evaluation, evaluationType = 'manual', doctorId, doctorName } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Response ID is required',
      });
    }

    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found',
      });
    }

    const evalText = evaluation !== undefined && evaluation !== null ? String(evaluation).trim() : '';
    const evalType = evaluationType === 'ai' ? 'ai' : 'manual';

    const evaluatorId = req.user?._id || doctorId || null;
    const evaluatorName = req.user?.name || doctorName || 'Evaluator';

    response.evaluation = evalText;
    response.evaluationType = evalType;
    response.evaluatorId = evaluatorId;
    response.evaluatorName = evaluatorName;
    response.evaluatedAt = new Date();

    if (evaluatorId && !response.doctorId) {
      response.doctorId = evaluatorId;
      response.doctorName = evaluatorName;
    }

    await response.save();

    await recordLog({
      action: 'RESPONSE_EVALUATED',
      details: `${evalType.toUpperCase()} evaluation saved for "${response.cardName}" (Patient: ${response.userName}) by ${evaluatorName}: "${evalText.slice(0, 40)}${evalText.length > 40 ? '...' : ''}"`,
      category: 'Responses',
      user: req.user || { name: evaluatorName, role: 'doctor' },
      severity: 'info',
    });

    // Invalidate cached statistics on evaluation
    appCache.invalidatePrefix('psychiatrist:');

    res.json({
      success: true,
      message: 'Evaluation saved successfully!',
      response,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users
// @desc    Get registered users with response counts
export const getUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role && role !== 'undefined' && role !== 'all' && role !== '') filter.role = role;
    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Aggregate response counts per user
    const responseCounts = await Response.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    responseCounts.forEach((r) => countMap.set(r._id.toString(), r.count));

    const enrichedUsers = users.map((u) => {
      const json = u.toJSON();
      json.responsesCount = countMap.get(u._id.toString()) || 0;
      return json;
    });

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users
// @desc    Create a new user account (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || 'user',
    });

    await recordLog({
      action: 'USER_CREATED_MANUALLY',
      details: `Administrator added user account "${user.name}" (${user.email}) with role [${user.role}].`,
      category: 'Security',
      user: req.user,
      severity: 'info',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/:id/role
// @desc    Update user role
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'psychiatrist', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, psychiatrist, or user',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await recordLog({
      action: 'USER_ROLE_CHANGED',
      details: `Role for "${user.name}" (${user.email}) changed from "${oldRole}" to "${role}".`,
      category: 'Security',
      user: req.user,
      severity: 'warning',
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users/:id
// @desc    Delete user account
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && user.email === 'lohithreddy1819@gmail.com') {
      return res.status(403).json({ success: false, message: 'Primary admin account cannot be deleted.' });
    }

    const userName = user.name;
    const userEmail = user.email;
    await User.findByIdAndDelete(req.params.id);

    await recordLog({
      action: 'USER_DELETED',
      details: `User account "${userName}" (${userEmail}) was deleted by administrator.`,
      category: 'Security',
      user: req.user,
      severity: 'danger',
    });

    res.status(200).json({
      success: true,
      message: `User ${userName} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users/patients/search
// @desc    Search patients by name, email, or mobile number (only patients/users, requiring search query)
export const searchPatients = async (req, res, next) => {
  try {
    const { q } = req.query;

    // Strict rule: Without a search query, no patients should be shown
    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        count: 0,
        patients: [],
      });
    }

    const queryStr = q.trim();
    // Strict rule: Only show users / patients (role: 'user'), never psychiatrists or admins
    const filter = {
      role: 'user',
      $or: [
        { name: { $regex: queryStr, $options: 'i' } },
        { email: { $regex: queryStr, $options: 'i' } },
        { phone: { $regex: queryStr, $options: 'i' } },
      ],
    };

    const patients = await User.find(filter)
      .select('name email phone age doctors role')
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: patients.length,
      patients: patients.map((p) => ({
        id: p._id,
        _id: p._id,
        name: p.name,
        email: p.email,
        phone: p.phone || '',
        age: p.age || null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users/patient/select
// @desc    Select existing patient and associate with current doctor
export const selectPatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    // Strict rule: Only select patients with role: 'user'
    const patient = await User.findOne({ _id: patientId, role: 'user' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Associate with current doctor if authenticated
    if (req.user && req.user._id) {
      if (!patient.doctors) patient.doctors = [];
      const docIdStr = req.user._id.toString();
      if (!patient.doctors.some((d) => d.toString() === docIdStr)) {
        patient.doctors.push(req.user._id);
        await patient.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Patient selected successfully',
      patient: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || '',
        age: patient.age || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users/patient
// @desc    Register a new patient or link existing global patient without duplicate error
export const createPatient = async (req, res, next) => {
  try {
    const { name, email, phone, age } = req.body;

    // Validate Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        field: 'name',
        message: 'Name is required.',
      });
    }

    // Validate Email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        field: 'email',
        message: 'Email ID is required.',
      });
    }
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        field: 'email',
        message: 'Please enter a valid email address.',
      });
    }

    // Validate Phone Number
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        field: 'phone',
        message: 'Phone number is required.',
      });
    }
    const cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        field: 'phone',
        message: 'Please enter a valid phone number (7 to 15 digits).',
      });
    }

    // Validate Age
    if (age === undefined || age === null || age === '' || isNaN(Number(age))) {
      return res.status(400).json({
        success: false,
        field: 'age',
        message: 'Age is required.',
      });
    }
    const numAge = Number(age);
    if (!Number.isInteger(numAge) || numAge < 1 || numAge > 125) {
      return res.status(400).json({
        success: false,
        field: 'age',
        message: 'Please enter a valid age between 1 and 125.',
      });
    }

    // Important requirement: Check if an existing global patient record already exists with this email or phone
    const existingPatient = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });

    if (existingPatient) {
      // Re-use existing patient record, associate with current doctor if authenticated
      if (req.user && req.user._id) {
        if (!existingPatient.doctors) existingPatient.doctors = [];
        const docIdStr = req.user._id.toString();
        if (!existingPatient.doctors.some((d) => d.toString() === docIdStr)) {
          existingPatient.doctors.push(req.user._id);
          await existingPatient.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Patient details confirmed successfully',
        user: {
          id: existingPatient._id,
          _id: existingPatient._id,
          name: existingPatient.name,
          email: existingPatient.email,
          phone: existingPatient.phone,
          age: existingPatient.age || numAge,
          role: existingPatient.role,
        },
      });
    }

    // Create new patient if none exists
    const tempPassword = 'Patient#' + Math.random().toString(36).substring(2, 8) + '!9';
    const passwordHash = await User.hashPassword(tempPassword);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      age: numAge,
      passwordHash,
      role: 'user',
      doctors: req.user?._id ? [req.user._id] : [],
    });

    await recordLog({
      action: 'PATIENT_REGISTERED',
      details: `New patient "${user.name}" (${user.email}, ${user.phone}, Age ${user.age}) registered for questionnaire response.`,
      category: 'User',
      user: { name: user.name, role: user.role, email: user.email },
      severity: 'info',
    });

    res.status(201).json({
      success: true,
      message: 'Patient details confirmed successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/logs
// @desc    Get activity / audit logs
export const getLogs = async (req, res, next) => {
  try {
    const { category, severity, search } = req.query;
    const filter = {};

    if (category && category !== 'undefined' && category !== '') filter.category = category;
    if (severity && severity !== 'undefined' && severity !== '') filter.severity = severity;
    if (search && search !== 'undefined' && search.trim() !== '') {
      filter.$or = [
        { action: { $regex: search.trim(), $options: 'i' } },
        { details: { $regex: search.trim(), $options: 'i' } },
        { userName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const logs = await Log.find(filter)
      .sort({ createdAt: -1 })
      .limit(150);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
