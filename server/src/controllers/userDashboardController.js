import mongoose from 'mongoose';
import User from '../models/User.js';
import Response from '../models/Response.js';
import Appointment from '../models/Appointment.js';
import Card from '../models/Card.js';
import appCache from '../utils/cacheService.js';
import { recordLog } from '../utils/auditLogger.js';

/**
 * Helper to get the authenticated User ID from req.user
 */
const getUserId = (req) => {
  if (req.user && req.user._id) return req.user._id;
  if (req.headers['x-user-id']) {
    try {
      if (mongoose.Types.ObjectId.isValid(req.headers['x-user-id'])) {
        return new mongoose.Types.ObjectId(req.headers['x-user-id']);
      }
    } catch (_) {}
  }
  return null;
};

// @route   GET /api/user/stats
// @desc    Get user-specific statistics for User Home Dashboard
//          Box 1: My Total Booked Appointments
//          Box 2: Total Consultations
//          Box 3: Evaluated Consultations
export const getUserDashboardStats = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User not identified.',
      });
    }

    const cacheKey = `user:stats:${userId.toString()}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        stats: cached,
        fromCache: true,
      });
    }

    // 1. My Total Booked Appointments
    // 2. Total Consultations
    // 3. Evaluated Consultations
    const [myTotalBookedAppointments, totalConsultations, evaluatedConsultations] = await Promise.all([
      Appointment.countDocuments({ patientId: userId }),
      Response.countDocuments({
        $or: [{ patientId: userId }, { userId: userId }],
      }),
      Response.countDocuments({
        $and: [
          { $or: [{ patientId: userId }, { userId: userId }] },
          { evaluation: { $exists: true, $ne: '' } },
        ],
      }),
    ]);

    const stats = {
      myTotalBookedAppointments,
      totalConsultations,
      evaluatedConsultations,
    };

    // Cache stats for 20 seconds
    appCache.set(cacheKey, stats, 20 * 1000);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/user/consultations
// @desc    Get all consultations belonging to the currently logged-in user
//          Format: S.No | Date | Doctor Name
export const getUserConsultations = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const responses = await Response.find({
      $or: [{ patientId: userId }, { userId: userId }],
    })
      .sort({ createdAt: -1 })
      .select('cardId cardName doctorId doctorName evaluation evaluationType questionText answer createdAt');

    const consultationList = responses.map((r, idx) => {
      const parsedDate = r.createdAt ? new Date(r.createdAt) : new Date();
      const d = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();

      return {
        id: r._id,
        _id: r._id,
        sNo: idx + 1,
        dateFormatted: `${day} ${month} ${year}`,
        dateShort: `${day} ${month}`,
        doctorName: r.doctorName || 'Dr. Sarah Jenkins',
        cardName: r.cardName || 'Assessment Card',
        hasEvaluation: Boolean(r.evaluation && r.evaluation.trim()),
        createdAt: r.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: consultationList.length,
      consultations: consultationList,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/user/consultations/:id
// @desc    Get complete consultation details for the logged-in user
export const getUserConsultationDetails = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultation ID format.',
      });
    }

    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found.',
      });
    }

    // Security Check: Strictly verify this consultation belongs to the authenticated user
    const ownsConsultation =
      (response.patientId && response.patientId.toString() === userId.toString()) ||
      (response.userId && response.userId.toString() === userId.toString());

    if (!ownsConsultation && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own consultations.',
      });
    }

    // Look up doctor profile if doctorId is present
    let doctorData = null;
    if (response.doctorId && mongoose.Types.ObjectId.isValid(response.doctorId)) {
      doctorData = await User.findById(response.doctorId).select('name email phone bio role');
    }

    // Look up card details
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
        consultationDateFormatted: `${day} ${month} ${year}, ${time}`,
        consultationDateShort: `${day} ${month} ${year}`,
        createdAt: response.createdAt,

        // Doctor Overview
        doctorId: response.doctorId || doctorData?._id,
        doctorName: doctorData?.name || response.doctorName || 'Dr. Sarah Jenkins',
        doctorEmail: doctorData?.email || 'sarah.jenkins@mindlab.clinic',
        doctorPhone: doctorData?.phone || '+91 9876543210',
        doctorSpecialization: 'Psychiatrist & Mental Health Clinician',

        // Card & Question
        cardId: response.cardId,
        cardName: response.cardName || cardData?.name || 'Assessment Card',
        cardGradient: cardData?.gradient || null,
        cardImageUrl: cardData?.imageUrl || null,
        rotationLabel: response.rotationLabel || 'Front (0°)',
        questionText: response.questionText || 'Clinical Assessment Question',

        // Patient Response
        patientResponse: response.answer || '',

        // Doctor Evaluation
        evaluation: response.evaluation || '',
        evaluationType: response.evaluationType || 'manual',
        evaluatedAt: response.evaluatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/user/doctors
// @desc    Get available psychiatrists/doctors eligible for appointment booking
export const getAvailableDoctors = async (req, res, next) => {
  try {
    // Find all users with role 'psychiatrist' or clinician
    let doctors = await User.find({ role: 'psychiatrist' })
      .select('name email phone bio role createdAt')
      .sort({ createdAt: -1 });

    // Fallback if no psychiatrist role exists yet, include admin clinician
    if (doctors.length === 0) {
      doctors = await User.find({ role: { $in: ['psychiatrist', 'admin'] } })
        .select('name email phone bio role createdAt');
    }

    const doctorList = doctors.map((doc, idx) => ({
      id: doc._id,
      _id: doc._id,
      sNo: idx + 1,
      name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
      email: doc.email,
      phone: doc.phone || '+91 9876543210',
      specialization: 'Psychiatrist & Clinical Specialist',
      experience: '8+ Years Clinical Experience',
      bio: doc.bio || 'Specializing in cognitive behavioural therapy, mindfulness interventions, anxiety management, and restorative emotional health.',
    }));

    res.status(200).json({
      success: true,
      count: doctorList.length,
      doctors: doctorList,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/user/appointments
// @desc    Book an appointment with a doctor for the authenticated user
export const createAppointment = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { doctorId, appointmentDate, appointmentTime, notes } = req.body;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Doctor selection is required.',
      });
    }

    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date is required.',
      });
    }

    if (!appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Appointment time slot is required.',
      });
    }

    // Retrieve doctor and patient
    const [doctor, patient] = await Promise.all([
      User.findById(doctorId),
      User.findById(userId),
    ]);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Selected doctor not found.',
      });
    }

    const doctorDisplayName = doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;

    const appointment = await Appointment.create({
      patientId: userId,
      patientName: patient?.name || req.user?.name || 'Patient',
      patientEmail: patient?.email || req.user?.email || '',
      patientPhone: patient?.phone || '',
      doctorId: doctor._id,
      doctorName: doctorDisplayName,
      doctorEmail: doctor.email,
      doctorPhone: doctor.phone || '+91 9876543210',
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      notes: (notes || '').trim(),
      status: 'confirmed',
    });

    // Link doctor to patient's doctors list if not already present
    if (patient) {
      try {
        if (!patient.doctors) patient.doctors = [];
        const docIdStr = doctor._id.toString();
        if (!patient.doctors.some((d) => d.toString() === docIdStr)) {
          patient.doctors.push(doctor._id);
          await patient.save();
        }
      } catch (_) {}
    }

    // Invalidate caches
    appCache.invalidatePrefix(`user:stats:${userId.toString()}`);
    appCache.invalidatePrefix(`psychiatrist:`);

    await recordLog({
      action: 'APPOINTMENT_BOOKED',
      details: `Appointment booked with ${doctorDisplayName} by ${patient?.name || 'Patient'} on ${appointmentDate} at ${appointmentTime}`,
      category: 'Appointments',
      user: req.user || { name: patient?.name || 'Patient', role: 'user' },
      severity: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/user/appointments
// @desc    Get booking history for the authenticated user
//          Format: S.No | Date | Doctor Name
export const getUserAppointments = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const appointments = await Appointment.find({ patientId: userId })
      .sort({ appointmentDate: -1, createdAt: -1 });

    const formattedList = appointments.map((app, idx) => {
      const parsedDate = app.appointmentDate ? new Date(app.appointmentDate) : new Date();
      const d = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();

      return {
        id: app._id,
        _id: app._id,
        sNo: idx + 1,
        dateFormatted: `${day} ${month} ${year}`,
        dateShort: `${day} ${month}`,
        time: app.appointmentTime,
        doctorName: app.doctorName,
        status: app.status || 'confirmed',
        notes: app.notes || '',
        createdAt: app.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedList.length,
      appointments: formattedList,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/user/appointments/:id
// @desc    Get detailed booking information and doctor profile for the popup modal
export const getUserAppointmentDetails = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.',
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Security Check: Strictly ensure user owns this appointment
    if (appointment.patientId.toString() !== userId.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own bookings.',
      });
    }

    // Retrieve doctor profile info for the Doctor Profile Card in modal
    let doctorData = null;
    if (appointment.doctorId && mongoose.Types.ObjectId.isValid(appointment.doctorId)) {
      doctorData = await User.findById(appointment.doctorId).select('name email phone bio role');
    }

    const appDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : new Date();
    const dApp = isNaN(appDate.getTime()) ? new Date() : appDate;
    const day = dApp.getDate().toString().padStart(2, '0');
    const month = dApp.toLocaleString('en-US', { month: 'short' });
    const year = dApp.getFullYear();

    const createdDate = appointment.createdAt ? new Date(appointment.createdAt) : new Date();
    const dCreated = isNaN(createdDate.getTime()) ? new Date() : createdDate;
    const bookedDay = dCreated.getDate().toString().padStart(2, '0');
    const bookedMonth = dCreated.toLocaleString('en-US', { month: 'short' });
    const bookedYear = dCreated.getFullYear();

    res.status(200).json({
      success: true,
      booking: {
        id: appointment._id,
        _id: appointment._id,
        appointmentDateFormatted: `${day} ${month} ${year}`,
        appointmentTime: appointment.appointmentTime || '10:00 AM',
        bookedOnFormatted: `${bookedDay} ${bookedMonth} ${bookedYear}`,
        status: appointment.status || 'confirmed',
        notes: appointment.notes || '',

        // Doctor Profile Details for Modal Card
        doctor: {
          id: appointment.doctorId,
          name: doctorData?.name || appointment.doctorName,
          specialization: 'Psychiatrist & Mental Health Clinician',
          email: doctorData?.email || appointment.doctorEmail || 'doctor@mindlab.clinic',
          phone: doctorData?.phone || appointment.doctorPhone || '+91 9876543210',
          bio: doctorData?.bio || 'Specializing in mindfulness therapy, stress resilience, and emotional wellness.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
