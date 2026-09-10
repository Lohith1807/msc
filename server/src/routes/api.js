import express from 'express';
import {
  getCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '../controllers/cardController.js';
import {
  getStats,
  getResponses,
  submitResponse,
  evaluateResponse,
  getUsers,
  createUser,
  createPatient,
  searchPatients,
  selectPatient,
  updateUserRole,
  deleteUser,
  getLogs,
} from '../controllers/adminController.js';
import {
  getPsychiatristStats,
  getPsychiatristPatients,
  getPatientDetails,
  getConsultationDetails,
} from '../controllers/psychiatristController.js';
import {
  getUserDashboardStats,
  getUserConsultations,
  getUserConsultationDetails,
  getAvailableDoctors,
  createAppointment,
  getUserAppointments,
  getUserAppointmentDetails,
} from '../controllers/userDashboardController.js';
import {
  getDevLogs,
  getDevLogDetail,
  updateDevLogStatus,
  deleteDevLog,
  clearResolvedLogs,
  getDevNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  receiveFrontendError,
} from '../controllers/devController.js';
import { optionalAuth, requireAuth, requireAdmin, requirePsychiatrist, requireDev } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optionalAuth to all routes so req.user is set if token is present
router.use(optionalAuth);

// --- Stats ---
router.get('/stats', getStats);

// --- Cards (End-User & Admin) ---
router.get('/cards', getCards);
router.get('/cards/:id', getCardById);
router.post('/cards', requireAdmin, createCard);
router.put('/cards/:id', requireAdmin, updateCard);
router.delete('/cards/:id', requireAdmin, deleteCard);

// --- Card Questions (Rotation Mapped) ---
router.post('/cards/:id/questions', requireAdmin, addQuestion);
router.put('/cards/:id/questions/reorder', requireAdmin, reorderQuestions);
router.put('/cards/:id/questions/:qId', requireAdmin, updateQuestion);
router.delete('/cards/:id/questions/:qId', requireAdmin, deleteQuestion);

// --- User Responses ---
router.get('/responses', getResponses);
router.post('/responses', submitResponse);
router.put('/responses/:id/evaluation', evaluateResponse);

// --- Users & Patients ---
router.get('/users/patients/search', searchPatients);
router.post('/users/patient/select', selectPatient);
router.post('/users/patient', createPatient);
router.get('/users', getUsers);
router.post('/users', requireAdmin, createUser);
router.put('/users/:id/role', requireAdmin, updateUserRole);
router.patch('/users/:id/role', requireAdmin, updateUserRole);
router.delete('/users/:id', requireAdmin, deleteUser);

// --- Activity Logs (Admin) ---
router.get('/logs', getLogs);

// --- Psychiatrist Portal Endpoints ---
router.get('/psychiatrist/stats', requireAuth, requirePsychiatrist, getPsychiatristStats);
router.get('/psychiatrist/patients', requireAuth, requirePsychiatrist, getPsychiatristPatients);
router.get('/psychiatrist/patients/:patientId', requireAuth, requirePsychiatrist, getPatientDetails);
router.get('/psychiatrist/consultations/:consultationId', requireAuth, requirePsychiatrist, getConsultationDetails);

// --- User / Patient Portal Endpoints ---
router.get('/user/stats', requireAuth, getUserDashboardStats);
router.get('/user/consultations', requireAuth, getUserConsultations);
router.get('/user/consultations/:id', requireAuth, getUserConsultationDetails);
router.get('/user/doctors', requireAuth, getAvailableDoctors);
router.post('/user/appointments', requireAuth, createAppointment);
router.get('/user/appointments', requireAuth, getUserAppointments);
router.get('/user/appointments/:id', requireAuth, getUserAppointmentDetails);

// --- Dev Logs (Dev/Admin only) ---
router.post('/dev/logs/frontend', receiveFrontendError);  // No auth required for frontend error collection
router.get('/dev/logs', requireAuth, requireDev, getDevLogs);
router.delete('/dev/logs/resolved', requireAuth, requireDev, clearResolvedLogs);
router.get('/dev/logs/:id', requireAuth, requireDev, getDevLogDetail);
router.patch('/dev/logs/:id/status', requireAuth, requireDev, updateDevLogStatus);
router.delete('/dev/logs/:id', requireAuth, requireDev, deleteDevLog);

// --- Dev Notifications ---
router.get('/dev/notifications', requireAuth, requireDev, getDevNotifications);
router.patch('/dev/notifications/read-all', requireAuth, requireDev, markAllNotificationsRead);
router.patch('/dev/notifications/:id/read', requireAuth, requireDev, markNotificationRead);

export default router;
