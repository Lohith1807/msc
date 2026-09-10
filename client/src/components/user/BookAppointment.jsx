import React, { useState, useEffect, useCallback } from 'react';
import { userDashboardAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

export default function BookAppointment({ onAppointmentBooked, onNavigateToHistory }) {
  const { toast } = useDialog();

  const [doctors, setDoctors] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Selected Doctor state for Step 2
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Booking Form fields
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:30 AM',
    '02:00 PM',
    '03:30 PM',
    '05:00 PM',
  ];

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'DR';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'DR';
    return parts
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const loadDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const res = await userDashboardAPI.getDoctors();
      if (res.success) {
        setDoctors(res.doctors || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load available specialists.');
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Set minimum date to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    // Default appointment date to tomorrow or today
    setAppointmentDate(todayStr);
    setAppointmentTime('10:00 AM');
    setNotes('');
  };

  const handleBackToList = () => {
    setSelectedDoctor(null);
  };

  const handleBookingSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDoctor) return;

    if (!appointmentDate) {
      toast.warning('Please select an appointment date.');
      return;
    }

    if (!appointmentTime) {
      toast.warning('Please select a time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await userDashboardAPI.bookAppointment({
        doctorId: selectedDoctor.id || selectedDoctor._id,
        appointmentDate,
        appointmentTime,
        notes,
      });

      if (res.success) {
        toast.success(`Appointment confirmed with ${selectedDoctor.name} on ${appointmentDate} at ${appointmentTime}!`);
        if (onAppointmentBooked) onAppointmentBooked();
        if (onNavigateToHistory) {
          onNavigateToHistory();
        } else {
          setSelectedDoctor(null);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: DOCTOR DETAILS PAGE (Profile Card + Booking Form)
  // -------------------------------------------------------------
  if (selectedDoctor) {
    return (
      <div className="admin-module-container">
        {/* Navigation Breadcrumb */}
        <div className="view-breadcrumb-bar">
          <button
            type="button"
            className="btn-back-home"
            onClick={handleBackToList}
          >
            ← Back to Doctors List
          </button>
        </div>

        {/* Section 1: Doctor Profile Card (Matching My Profile Design) */}
        <div className="profile-card-main" style={{ maxWidth: '850px', margin: '0 auto 28px' }}>
          <div className="profile-header-banner" style={{ background: 'linear-gradient(135deg, #1c3a52 0%, #0d9488 100%)' }}>
            <div className="profile-header-inner">
              <div className="profile-avatar-large">
                {getInitials(selectedDoctor.name)}
              </div>
              <div className="profile-user-headline">
                <span style={{ fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: '700' }}>
                  Verified Specialist
                </span>
                <h2 className="profile-name">{selectedDoctor.name}</h2>
                <p className="profile-email">
                  {selectedDoctor.email}
                  {selectedDoctor.phone ? ` • ${selectedDoctor.phone}` : ''}
                </p>
                <div className="profile-role-badge-row">
                  <span className="profile-verified-badge">
                    ✓ MindLab Certified Psychiatrist
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            <h3 className="section-subtitle" style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
              🩺 Doctor Information
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 20px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Doctor Name</span>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {selectedDoctor.name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Specialization</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d9488', marginTop: '2px' }}>
                  {selectedDoctor.specialization || 'Psychiatrist & Clinical Specialist'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                  {selectedDoctor.phone || 'Available Upon Booking'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</span>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', marginTop: '2px' }}>
                  {selectedDoctor.email || 'doctor@mindlab.clinic'}
                </div>
              </div>
            </div>

            {selectedDoctor.bio && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '14px 18px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Clinical Focus & Background</span>
                <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#334155', lineHeight: 1.55 }}>
                  {selectedDoctor.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Book An Appointment Form */}
        <div className="admin-table-card" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)' }}>
              Book An Appointment
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
              Choose your preferred date and time slot for a session with {selectedDoctor.name}.
            </p>
          </div>

          <form onSubmit={handleBookingSubmit} style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '22px' }}>
              {/* Date Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Appointment Date *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Time Slot Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Available Time Slot *
                </label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    background: '#fff',
                  }}
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes / Reason */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Consultation Topic / Reason for Visit (Optional)
              </label>
              <textarea
                placeholder="Briefly describe what you'd like to discuss (e.g., anxiety management, mindfulness strategies, work burnout)..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#0f172a',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleBackToList}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
                style={{ padding: '10px 28px', fontSize: '14px', fontWeight: '700' }}
              >
                {isSubmitting ? 'Confirming Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 1: AVAILABLE DOCTORS LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="admin-module-container">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Patient Services</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="admin-title">Book An Appointment</h2>
            <span className="count-badge-pill">{doctors.length} Doctors Available</span>
          </div>
          <p className="admin-subtitle">
            Select a verified clinical psychiatrist to schedule your upcoming consultation.
          </p>
        </div>
        <div className="admin-header-actions-group">
          <button
            type="button"
            className="btn-header-half btn-refresh"
            onClick={loadDoctors}
            disabled={isLoadingDoctors}
            title="Refresh Doctors Directory"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Available Doctors Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>S.No</th>
                <th>Doctor Name</th>
                <th>Phone No</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingDoctors ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading available specialists...</p>
                  </td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>🩺</span>
                      <p>No specialists are currently available for booking. Please check back later.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                doctors.map((doc, idx) => (
                  <tr
                    key={doc.id || doc._id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectDoctor(doc)}
                  >
                    <td>
                      <strong>{doc.sNo || idx + 1}</strong>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-xs" style={{ background: '#1c3a52', color: '#fff' }}>
                          {getInitials(doc.name)}
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>{doc.name}</strong>
                          <span style={{ display: 'block', fontSize: '12px', color: '#0d9488', fontWeight: '600' }}>
                            {doc.specialization}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#334155', fontWeight: '600', fontSize: '13.5px' }}>
                        {doc.phone || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDoctor(doc);
                        }}
                      >
                        Select Doctor →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
