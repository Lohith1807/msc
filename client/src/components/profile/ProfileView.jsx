import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { calculateAge, getTodayDateString } from '../../utils/dateUtils';

export default function ProfileView({ onSelectView }) {
  const { user, role, logout, updateUserData } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [dob, setDob] = useState(() => {
    if (user?.dob) {
      try {
        return new Date(user.dob).toISOString().split('T')[0];
      } catch {
        return user.dob;
      }
    }
    return '';
  });

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      if (user.dob) {
        try {
          setDob(new Date(user.dob).toISOString().split('T')[0]);
        } catch {
          setDob(user.dob);
        }
      } else {
        setDob('');
      }
    }
  }, [user]);

  // Dynamically calculate age from DOB
  const calculatedAge = calculateAge(dob) ?? user?.age ?? null;

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const getInitials = (userName) => {
    if (!userName) return 'ML';
    return userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Full name cannot be empty.');
      return;
    }

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        setErrorMessage('Date of birth cannot be in the future.');
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        dob: dob || null,
      });

      if (res.success && res.user) {
        updateUserData(res.user);
        setSuccessMessage('Profile information saved successfully!');
      } else {
        // Fallback for demo mode
        updateUserData({
          ...user,
          name: name.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          dob: dob || null,
          age: calculateAge(dob) ?? user?.age ?? null,
        });
        setSuccessMessage('Profile information updated successfully!');
      }
    } catch (err) {
      // If demo token or network error, update local user state
      updateUserData({
        ...user,
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        dob: dob || null,
        age: calculateAge(dob) ?? user?.age ?? null,
      });
      setSuccessMessage('Profile information updated successfully!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authAPI.updateProfile({
        currentPassword,
        newPassword,
      });
      setSuccessMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to change password. Check your current password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="profile-page-container">
      {/* Return to Home Bar */}
      <div className="profile-top-nav-row">
        <button
          type="button"
          className="btn-back-home"
          onClick={() => onSelectView('cards')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Home
        </button>
      </div>

      <div className="profile-card-main">
        {/* Banner Header with User Info Aligned Cleanly Inside */}
        <div className="profile-header-banner">
          <div className="profile-header-inner">
            <div className="profile-avatar-large">
              {getInitials(name || user?.name)}
            </div>
            <div className="profile-user-headline">
              <h2 className="profile-name">{name || user?.name || 'MindLab Member'}</h2>
              <p className="profile-email">{user?.email || 'lohithreddy1819@gmail.com'}</p>
              <div className="profile-role-badge-row">
                <span className="profile-verified-badge">
                  ✓ Verified MindLab Account
                </span>
                {calculatedAge !== null && (
                  <span
                    className="profile-verified-badge"
                    style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                  >
                    Age: {calculatedAge} yrs
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="alert-banner alert-success" style={{ margin: '20px 28px 0' }}>
            <span>{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage('')}>✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="alert-banner alert-error" style={{ margin: '20px 28px 0' }}>
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')}>✕</button>
          </div>
        )}

        <div className="profile-body-sections">
          {/* Section 1: Edit Personal Information (One by One) */}
          <div className="profile-section-box">
            <div className="section-title-row">
              <div>
                <h3 className="section-subtitle">👤 Personal Information</h3>
                <p className="section-desc">View and update your personal details and bio.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-edit-form">
              <div className="form-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-field">
                <label>Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || email}
                  className="input-disabled"
                  title="Email is tied to your primary account identifier"
                />
              </div>

              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Date of Birth</label>
                  {calculatedAge !== null && (
                    <span
                      id="profileCalculatedAgeBadge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(13, 148, 136, 0.1)',
                        color: '#0d9488',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: '1px solid rgba(13, 148, 136, 0.25)',
                      }}
                    >
                      Age: {calculatedAge} years old
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  id="profileDobInput"
                  name="dob"
                  max={getTodayDateString()}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
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
                {dob && calculatedAge !== null && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                    Age is calculated dynamically as <strong>{calculatedAge} years old</strong> based on current date.
                  </span>
                )}
              </div>

              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="form-field">
                <label>Bio / Professional Focus</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short bio or clinical/personal focus..."
                />
              </div>

              <div className="profile-form-footer">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Security & Password (One by One) */}
          <div className="profile-section-box">
            <h3 className="section-subtitle">🔒 Security & Password</h3>
            <p className="section-desc">Ensure your account is protected with a secure password.</p>

            <form onSubmit={handleUpdatePassword} className="profile-edit-form">
              <div className="form-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="form-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                />
              </div>

              <div className="profile-form-footer">
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={isChangingPass || !newPassword}
                >
                  {isChangingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
