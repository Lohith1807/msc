import React, { useState, useEffect, useCallback } from 'react';
import { userDashboardAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

export default function UserConsultationsList({ onSelectView }) {
  const { toast } = useDialog();

  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected consultation for Details view: null | consultation Object
  const [selectedConsultation, setSelectedConsultation] = useState(null);
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

  const loadConsultations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userDashboardAPI.getConsultations();
      if (res.success) {
        setConsultations(res.consultations || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load your consultations.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const handleOpenDetails = async (consultation) => {
    setIsLoadingDetails(true);
    setSelectedConsultation(consultation);
    try {
      const res = await userDashboardAPI.getConsultationDetails(consultation.id || consultation._id);
      if (res.success && res.consultation) {
        setSelectedConsultation(res.consultation);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load consultation details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedConsultation(null);
  };

  // -----------------------------------------------------------------
  // VIEW: CONSULTATION DETAILS VIEW (Overview Card + Session Details)
  // -----------------------------------------------------------------
  if (selectedConsultation) {
    return (
      <div className="admin-module-container" style={{ marginTop: '24px' }}>
        {/* Navigation Breadcrumb */}
        <div className="view-breadcrumb-bar">
          <button
            type="button"
            className="btn-back-home"
            onClick={handleBackToList}
          >
            ← Back to Consultations List
          </button>
        </div>

        {isLoadingDetails ? (
          <div className="admin-table-card" style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading consultation record...</p>
          </div>
        ) : (
          <div className="profile-card-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            {/* Top Overview / Profile Card */}
            <div className="profile-header-banner" style={{ background: 'linear-gradient(135deg, #1c3a52 0%, #0d9488 100%)' }}>
              <div className="profile-header-inner">
                <div className="profile-avatar-large">
                  {getInitials(selectedConsultation.doctorName)}
                </div>
                <div className="profile-user-headline">
                  <span style={{ fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: '700' }}>
                    Consultation Record
                  </span>
                  <h2 className="profile-name">{selectedConsultation.doctorName || 'Dr. Sarah Jenkins'}</h2>
                  <p className="profile-email">
                    {selectedConsultation.doctorEmail || 'doctor@mindlab.clinic'}
                    {selectedConsultation.doctorPhone ? ` • ${selectedConsultation.doctorPhone}` : ''}
                    {' • '}Psychiatrist & Clinical Specialist
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: '28px' }}>
              {/* 1. Consultation Information Block */}
              <div className="eval-card-block" style={{ marginBottom: '24px' }}>
                <div className="eval-block-label">Session Information</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 18px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Consultation Date</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                      {selectedConsultation.consultationDateFormatted || selectedConsultation.dateFormatted}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Clinician</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {selectedConsultation.doctorName}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Assessment Card</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-accent-dark, #0d9488)', marginTop: '2px' }}>
                      {selectedConsultation.cardName}
                      {selectedConsultation.rotationLabel && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginLeft: '6px' }}>
                          ({selectedConsultation.rotationLabel})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Question Block */}
              <div className="eval-card-block" style={{ marginBottom: '24px' }}>
                <div className="eval-block-label">Assessment Question</div>
                <div className="eval-question-content" style={{ fontSize: '15px', padding: '14px 18px' }}>
                  {selectedConsultation.questionText || 'Clinical Reflection Prompt'}
                </div>
              </div>

              {/* 3. User Response Block */}
              <div className="eval-card-block" style={{ marginBottom: '24px' }}>
                <div className="eval-block-label">Your Submitted Response</div>
                <div className="eval-response-content" style={{ fontSize: '14.5px', padding: '16px 18px' }}>
                  {selectedConsultation.patientResponse || (
                    <em style={{ color: '#94a3b8' }}>No response text recorded for this session.</em>
                  )}
                </div>
              </div>

              {/* 4. Doctor/Psychiatrist Evaluation Block */}
              <div className="eval-card-block">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="eval-block-label" style={{ margin: 0 }}>Doctor's Clinical Evaluation</div>
                  {selectedConsultation.evaluation && (
                    <span className="eval-saved-tag">
                      ✓ Evaluated by {selectedConsultation.doctorName}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: selectedConsultation.evaluation ? '#fdf8f6' : '#fafbfc',
                    border: '1.5px solid',
                    borderColor: selectedConsultation.evaluation ? '#fed7aa' : '#e2e8f0',
                    borderLeft: selectedConsultation.evaluation ? '4px solid #ea580c' : '1.5px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    padding: '18px 20px',
                  }}
                >
                  {selectedConsultation.evaluation ? (
                    <p style={{ margin: 0, fontSize: '14.5px', color: '#1e293b', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {selectedConsultation.evaluation}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontStyle: 'italic' }}>
                      Your clinical evaluation has not been completed by the doctor yet. Once evaluated, the doctor's observations and recommended plan will appear here.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // VIEW: MY CONSULTATIONS LIST TABLE (Rendered below the 3 stat boxes)
  // -----------------------------------------------------------------
  return (
    <div className="admin-table-card" style={{ marginTop: '24px' }}>
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>
            My Consultations
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            A record of all your clinical sessions and consultations.
          </p>
        </div>
        <span className="count-badge-pill">
          {consultations.length} Consultations
        </span>
      </div>

      <div className="table-responsive">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>S.No</th>
              <th>Date</th>
              <th>Doctor Name</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: 'var(--color-text-muted)' }}>Loading your consultations...</p>
                </td>
              </tr>
            ) : consultations.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-table-state">
                    <span>🩺</span>
                    <p>You have not completed any consultations yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              consultations.map((item, idx) => (
                <tr
                  key={item._id || item.id || idx}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleOpenDetails(item)}
                >
                  <td>
                    <strong>{item.sNo || idx + 1}</strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      {item.dateShort || item.dateFormatted}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar-xs" style={{ background: '#1c3a52', color: '#fff' }}>
                        {getInitials(item.doctorName)}
                      </div>
                      <strong style={{ color: '#0f172a' }}>{item.doctorName}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '6px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(item);
                      }}
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
