import React, { useState, useEffect, useCallback, useRef } from 'react';
import { psychiatristAPI, platformAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

export default function PsychiatristPatients({ onBackToHome }) {
  const { toast } = useDialog();

  // Navigation levels: 'list' | 'patient-details' | 'consultation-details'
  const [viewMode, setViewMode] = useState('list');

  // Data states
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // High-Performance In-Memory Hash Map Caches for O(1) Instant Retrieval
  const patientDetailsCache = useRef(new Map());
  const consultationCache = useRef(new Map());

  // Selected Patient states
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Selected Consultation states
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [isLoadingConsultation, setIsLoadingConsultation] = useState(false);
  const [editEvaluation, setEditEvaluation] = useState('');
  const [isSavingEval, setIsSavingEval] = useState(false);

  // Helper for Initials
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'PT';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PT';
    return parts
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Load My Patients
  const loadPatients = useCallback(async (query = '') => {
    setIsLoadingPatients(true);
    setErrorMessage('');
    try {
      const res = await psychiatristAPI.getPatients(query);
      if (res.success) {
        setPatients(res.patients || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load patients list.');
      toast.error(err.message || 'Failed to load patients list.');
    } finally {
      setIsLoadingPatients(false);
    }
  }, [toast]);

  // Debounced search for instant real-time filtering without UI lag
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadPatients]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    loadPatients(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadPatients('');
  };

  // Select patient & load consultation history with O(1) Hash Map Cache + Revalidation
  const handleSelectPatient = async (patient) => {
    const patientId = (patient.id || patient._id)?.toString();
    setSelectedPatient(patient);
    setViewMode('patient-details');

    const cached = patientDetailsCache.current.get(patientId);
    if (cached) {
      // Instant O(1) rendering from cache
      setSelectedPatient(cached.patient);
      setConsultations(cached.consultations);
      setIsLoadingDetails(false);

      // Asynchronous background revalidation (Stale-While-Revalidate)
      psychiatristAPI.getPatientDetails(patientId).then((res) => {
        if (res.success) {
          const freshData = {
            patient: res.patient || patient,
            consultations: res.consultations || [],
          };
          patientDetailsCache.current.set(patientId, freshData);
          setSelectedPatient(freshData.patient);
          setConsultations(freshData.consultations);
        }
      }).catch(() => {});
      return;
    }

    setIsLoadingDetails(true);
    setConsultations([]);
    try {
      const res = await psychiatristAPI.getPatientDetails(patientId);
      if (res.success) {
        const fullPatient = res.patient || patient;
        const consults = res.consultations || [];
        patientDetailsCache.current.set(patientId, {
          patient: fullPatient,
          consultations: consults,
        });
        setSelectedPatient(fullPatient);
        setConsultations(consults);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load patient consultations.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Select consultation & load full details with O(1) Hash Map Cache
  const handleSelectConsultation = async (consultation) => {
    const consultationId = (consultation.id || consultation._id)?.toString();
    setViewMode('consultation-details');

    const cached = consultationCache.current.get(consultationId);
    if (cached) {
      // Instant O(1) rendering
      setSelectedConsultation(cached);
      setEditEvaluation(cached.evaluation || '');
      setIsLoadingConsultation(false);

      // Background revalidation
      psychiatristAPI.getConsultationDetails(consultationId).then((res) => {
        if (res.success && res.consultation) {
          consultationCache.current.set(consultationId, res.consultation);
          setSelectedConsultation(res.consultation);
        }
      }).catch(() => {});
      return;
    }

    setIsLoadingConsultation(true);
    setSelectedConsultation(null);
    try {
      const res = await psychiatristAPI.getConsultationDetails(consultationId);
      if (res.success && res.consultation) {
        consultationCache.current.set(consultationId, res.consultation);
        setSelectedConsultation(res.consultation);
        setEditEvaluation(res.consultation.evaluation || '');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load consultation details.');
    } finally {
      setIsLoadingConsultation(false);
    }
  };

  // Save or update evaluation
  const handleSaveEvaluationSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedConsultation) return;

    const cleanEval = editEvaluation.trim();
    if (!cleanEval) {
      toast.warning('Please enter an evaluation before saving.');
      return;
    }

    const consultationId = (selectedConsultation.id || selectedConsultation._id)?.toString();
    setIsSavingEval(true);
    try {
      const res = await platformAPI.evaluateResponse(consultationId, {
        evaluation: cleanEval,
        evaluationType: 'manual',
      });

      if (res.success) {
        toast.success('Consultation evaluation saved successfully!');
        const updatedConsultation = {
          ...selectedConsultation,
          evaluation: cleanEval,
          evaluationType: 'manual',
          evaluatedAt: new Date(),
        };

        setSelectedConsultation(updatedConsultation);
        consultationCache.current.set(consultationId, updatedConsultation);

        // Invalidate and refresh consultations in background
        if (selectedPatient) {
          const patientId = (selectedPatient.id || selectedPatient._id)?.toString();
          psychiatristAPI.getPatientDetails(patientId).then((r) => {
            if (r.success) {
              setConsultations(r.consultations || []);
              patientDetailsCache.current.set(patientId, {
                patient: selectedPatient,
                consultations: r.consultations || [],
              });
            }
          });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save evaluation.');
    } finally {
      setIsSavingEval(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER LEVEL 3: CONSULTATION DETAILS VIEW
  // -------------------------------------------------------------
  if (viewMode === 'consultation-details') {
    return (
      <div className="admin-module-container">
        {/* Navigation Breadcrumb */}
        <div className="view-breadcrumb-bar">
          <button
            type="button"
            className="btn-back-home"
            onClick={() => setViewMode('patient-details')}
          >
            ← Back to Patient Details
          </button>
        </div>

        {isLoadingConsultation ? (
          <div className="admin-table-card" style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading consultation details...</p>
          </div>
        ) : !selectedConsultation ? (
          <div className="admin-table-card" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Consultation record not found or inaccessible.</p>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '12px' }}
              onClick={() => setViewMode('patient-details')}
            >
              Return to Patient History
            </button>
          </div>
        ) : (
          <div className="profile-card-main" style={{ maxWidth: '850px', margin: '0 auto' }}>
            {/* Consultation Top Banner */}
            <div className="profile-header-banner" style={{ background: 'linear-gradient(135deg, #1c3a52 0%, #0d9488 100%)' }}>
              <div className="profile-header-inner">
                <div className="profile-avatar-large">
                  {getInitials(selectedConsultation.patientName)}
                </div>
                <div className="profile-user-headline">
                  <span style={{ fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: '700' }}>
                    Consultation Record
                  </span>
                  <h2 className="profile-name">{selectedConsultation.patientName}</h2>
                  <p className="profile-email">
                    {selectedConsultation.patientEmail || 'No email registered'}
                    {selectedConsultation.patientPhone ? ` • ${selectedConsultation.patientPhone}` : ''}
                    {selectedConsultation.patientAge ? ` • ${selectedConsultation.patientAge} yrs` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: '28px' }}>
              {/* 1. Consultation Information Block */}
              <div className="eval-card-block" style={{ marginBottom: '24px' }}>
                <div className="eval-block-label">Consultation Information</div>
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
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Patient</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                      {selectedConsultation.patientName}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Consultation Date</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                      {selectedConsultation.consultationDateFormatted || selectedConsultation.consultationDateShort}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Assessment Card</span>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-accent-dark, #0d9488)', marginTop: '2px' }}>
                      {selectedConsultation.cardName || 'Assessment Card'}
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
                <div className="eval-block-label">Question</div>
                <div className="eval-question-content" style={{ fontSize: '15px', padding: '14px 18px' }}>
                  {selectedConsultation.questionText || 'Question text not available.'}
                </div>
              </div>

              {/* 3. Patient Response Block */}
              <div className="eval-card-block" style={{ marginBottom: '24px' }}>
                <div className="eval-block-label">Patient Response</div>
                <div className="eval-response-content" style={{ fontSize: '14.5px', padding: '16px 18px' }}>
                  {selectedConsultation.patientResponse || (
                    <em style={{ color: '#94a3b8' }}>No response text recorded.</em>
                  )}
                </div>
              </div>

              {/* 4. Psychiatrist Evaluation Block */}
              <div className="eval-card-block">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="eval-block-label" style={{ margin: 0 }}>Psychiatrist Evaluation</div>
                  {selectedConsultation.evaluation && (
                    <span className="eval-saved-tag">
                      ✓ Saved ({selectedConsultation.evaluationType === 'ai' ? 'AI Generated' : 'Clinician Evaluation'})
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
                    padding: '16px 18px',
                    marginBottom: '16px',
                  }}
                >
                  {selectedConsultation.evaluation ? (
                    <p style={{ margin: 0, fontSize: '14.5px', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedConsultation.evaluation}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontStyle: 'italic' }}>
                      No evaluation has been recorded yet for this session. Enter your clinical assessment below.
                    </p>
                  )}
                </div>

                {/* Edit / Provide Evaluation Form */}
                <form onSubmit={handleSaveEvaluationSubmit} style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    {selectedConsultation.evaluation ? 'Update Evaluation Notes:' : 'Add Evaluation Assessment:'}
                  </label>
                  <textarea
                    className="eval-manual-textarea"
                    placeholder="Enter clinical assessment notes, symptoms observation, and recommended care plan..."
                    rows={4}
                    value={editEvaluation}
                    onChange={(e) => setEditEvaluation(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSavingEval}
                      style={{ padding: '8px 22px', fontSize: '13.5px' }}
                    >
                      {isSavingEval ? 'Saving...' : selectedConsultation.evaluation ? 'Update Evaluation' : 'Save Evaluation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER LEVEL 2: PATIENT DETAILS VIEW (Profile Card + Consultations)
  // -------------------------------------------------------------
  if (viewMode === 'patient-details') {
    return (
      <div className="admin-module-container">
        {/* Navigation Breadcrumb */}
        <div className="view-breadcrumb-bar">
          <button
            type="button"
            className="btn-back-home"
            onClick={() => setViewMode('list')}
          >
            ← Back to My Patients
          </button>
        </div>

        {/* Section 1: Overview / Profile Card (Matching My Profile Design) */}
        <div className="profile-card-main" style={{ marginBottom: '28px' }}>
          <div className="profile-header-banner">
            <div className="profile-header-inner">
              <div className="profile-avatar-large">
                {getInitials(selectedPatient?.name)}
              </div>
              <div className="profile-user-headline">
                <h2 className="profile-name">{selectedPatient?.name || 'Patient'}</h2>
                <p className="profile-email">{selectedPatient?.email || 'No email registered'}</p>
                <div className="profile-role-badge-row">
                  <span className="profile-verified-badge">
                    ✓ Verified MindLab Patient
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            <h3 className="section-subtitle" style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
              👤 Patient Information
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
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Patient Name</span>
                <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {selectedPatient?.name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Email ID</span>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', marginTop: '2px' }}>
                  {selectedPatient?.email || 'Not provided'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Mobile Number</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                  {selectedPatient?.phone || 'Not provided'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Age</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                  {selectedPatient?.age ? `${selectedPatient.age} years old` : 'Not provided'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Patient Consultation List */}
        <div className="admin-table-card">
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>
                Consultation History
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                All consultations and responses recorded between you and {selectedPatient?.name}.
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
                  <th>Card Name</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Response</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingDetails ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="spinner" style={{ margin: '0 auto 10px' }} />
                      <p style={{ color: 'var(--color-text-muted)' }}>Loading consultations...</p>
                    </td>
                  </tr>
                ) : consultations.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="empty-table-state">
                        <span>📋</span>
                        <p>No consultations found for this patient yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  consultations.map((item, idx) => (
                    <tr
                      key={item._id || item.id || idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectConsultation(item)}
                    >
                      <td>
                        <strong>{idx + 1}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                          {item.dateFormatted || item.dateShort}
                        </span>
                      </td>
                      <td>
                        <span className="badge-card-name" style={{ fontSize: '13.5px' }}>
                          {item.cardName}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          style={{ padding: '6px 14px', fontSize: '12.5px', borderRadius: '6px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectConsultation(item);
                          }}
                        >
                          View
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

  // -------------------------------------------------------------
  // RENDER LEVEL 1: PATIENTS DIRECTORY LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="admin-module-container">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Clinician Portal</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="admin-title">My Patients</h2>
            <span className="count-badge-pill">{patients.length} Patients</span>
          </div>
          <p className="admin-subtitle">
            Patients who have consulted or interacted with your clinical assessments.
          </p>
        </div>
        <div className="admin-header-actions-group">
          <button
            type="button"
            className="btn-header-half btn-refresh"
            onClick={() => loadPatients(searchQuery)}
            disabled={isLoadingPatients}
            title="Refresh Patients Directory"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert-banner alert-error" style={{ marginBottom: '16px' }}>
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-form-grid" style={{ gridTemplateColumns: '1fr auto auto' }}>
          <div className="filter-input-wrap">
            <label>Search patient by name, email, or mobile number</label>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-actions-wrap" style={{ alignSelf: 'flex-end' }}>
            <button type="submit" className="btn-primary btn-sm">
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Patients Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>S.No</th>
                <th>Patient Name</th>
                <th>Email ID</th>
                <th>Mobile Number</th>
                <th>Age</th>
                <th>Consultations</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPatients ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading your patients...</p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>🩺</span>
                      <p>
                        {searchQuery
                          ? 'No patients found matching your search.'
                          : 'No patients have interacted with your clinical consultations yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((p, idx) => (
                  <tr
                    key={p.id || p._id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectPatient(p)}
                  >
                    <td>
                      <strong>{idx + 1}</strong>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-xs" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#334155', fontSize: '13.5px' }}>
                        {p.email || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#475569', fontSize: '13px' }}>
                        {p.phone || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#475569', fontSize: '13px' }}>
                        {p.age ? `${p.age} yrs` : '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#f0fdfa',
                          color: '#0d9488',
                          border: '1px solid #ccfbf1',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '12px',
                        }}
                      >
                        {p.consultationCount || 0} Sessions
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPatient(p);
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
    </div>
  );
}
