import React, { useState, useEffect, useCallback } from 'react';
import { userDashboardAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

export default function BookingHistory({ onNavigateToBook }) {
  const { toast } = useDialog();

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Popup Modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userDashboardAPI.getAppointments();
      if (res.success) {
        setAppointments(res.appointments || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load booking history.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleOpenBookingModal = async (bookingItem) => {
    // Show quick modal skeleton with basic info
    setSelectedBooking({
      ...bookingItem,
      doctor: {
        name: bookingItem.doctorName,
        specialization: 'Psychiatrist & Mental Health Clinician',
        phone: '+91 9876543210',
        email: 'doctor@mindlab.clinic',
      },
    });
    setIsLoadingDetails(true);

    try {
      const res = await userDashboardAPI.getAppointmentDetails(bookingItem.id || bookingItem._id);
      if (res.success && res.booking) {
        setSelectedBooking(res.booking);
      }
    } catch (err) {
      // Keep basic info displayed if details fetch fails
      console.warn('Could not fetch extra booking details:', err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  return (
    <div className="admin-module-container">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Patient Appointments</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="admin-title">Booking History</h2>
            <span className="count-badge-pill">{appointments.length} Bookings</span>
          </div>
          <p className="admin-subtitle">
            A complete record of your scheduled clinical consultations.
          </p>
        </div>
        <div className="admin-header-actions-group">
          {onNavigateToBook && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={onNavigateToBook}
            >
              + Book New Appointment
            </button>
          )}
          <button
            type="button"
            className="btn-header-half btn-refresh"
            onClick={loadAppointments}
            disabled={isLoading}
            title="Refresh History"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Bookings Table: S.No | Date | Doctor Name */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>S.No</th>
                <th>Date</th>
                <th>Doctor Name</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading your booking history...</p>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>📅</span>
                      <p>You have not made any appointment bookings yet.</p>
                      {onNavigateToBook && (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          style={{ marginTop: '12px' }}
                          onClick={onNavigateToBook}
                        >
                          Book Your First Appointment →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((item, idx) => (
                  <tr
                    key={item.id || item._id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenBookingModal(item)}
                  >
                    <td>
                      <strong>{item.sNo || idx + 1}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                          {item.dateShort || item.dateFormatted}
                        </span>
                        {item.time && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {item.time}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-xs" style={{ background: '#1c3a52', color: '#fff' }}>
                          {getInitials(item.doctorName)}
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{item.doctorName}</strong>
                          <span
                            style={{
                              display: 'inline-block',
                              marginLeft: '8px',
                              background: '#ecfdf5',
                              color: '#047857',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {item.status || 'Confirmed'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        style={{ padding: '6px 14px', fontSize: '12.5px', borderRadius: '6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBookingModal(item);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* BOOKING DETAILS POPUP / MODAL                                     */}
      {/* ----------------------------------------------------------------- */}
      {selectedBooking && (
        <div
          className="modal-overlay"
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--color-primary)' }}>
                  Booking Details
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Consultation Appointment Reference
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* 1. Booking Information */}
              <div
                style={{
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', textTransform: 'uppercase' }}>
                      Appointment Date
                    </span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {selectedBooking.appointmentDateFormatted || selectedBooking.dateFormatted || selectedBooking.dateShort}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', textTransform: 'uppercase' }}>
                      Appointment Time
                    </span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {selectedBooking.appointmentTime || selectedBooking.time || '10:00 AM'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                      Booked On
                    </span>
                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', marginTop: '2px' }}>
                      {selectedBooking.bookedOnFormatted || selectedBooking.dateFormatted}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                      Status
                    </span>
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '2px',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          fontSize: '12px',
                          fontWeight: '700',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          textTransform: 'capitalize',
                        }}
                      >
                        ✓ {selectedBooking.status || 'Confirmed'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #ccfbf1' }}>
                    <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', textTransform: 'uppercase' }}>
                      Consultation Topic / Notes:
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155' }}>
                      "{selectedBooking.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0' }} />

              {/* 2. Doctor Information Card */}
              <div>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Doctor Information
                </span>

                <div
                  style={{
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div
                    className="avatar-lg"
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1c3a52 0%, #0d9488 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(selectedBooking.doctor?.name || selectedBooking.doctorName)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                      {selectedBooking.doctor?.name || selectedBooking.doctorName}
                    </h4>
                    <span style={{ fontSize: '12.5px', color: '#0d9488', fontWeight: '700' }}>
                      {selectedBooking.doctor?.specialization || 'Psychiatrist & Clinical Specialist'}
                    </span>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569' }}>
                      <div>📞 {selectedBooking.doctor?.phone || '+91 9876543210'}</div>
                      <div style={{ marginTop: '2px' }}>✉️ {selectedBooking.doctor?.email || 'doctor@mindlab.clinic'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
                style={{ padding: '8px 24px', fontSize: '13.5px', fontWeight: '700' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
