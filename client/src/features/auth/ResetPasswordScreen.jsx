import React, { useState } from 'react';
import Logo from './Logo';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ResetPasswordScreen({
  token,
  onBack,
  onNavigateLogin,
  onResetSuccess,
}) {
  const { saveAuthSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await authAPI.resetPassword(token, { password });
      setSuccessMsg(data.message);
      if (data.token && data.user) {
        saveAuthSession(data.token, data.user);
      }
      setTimeout(() => {
        if (onResetSuccess) {
          onResetSuccess();
        } else if (onNavigateLogin) {
          onNavigateLogin();
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen" id="reset-password">
      <svg
        className="login-decor"
        viewBox="0 0 375 812"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 0 C40 40 20 100 0 130 L0 0 Z" fill="#dcecef" />
        <path d="M375 60 C330 100 340 170 375 190 L375 60 Z" fill="#e3f0ef" />
        <path d="M0 812 C60 760 40 680 0 650 L0 812 Z" fill="#dcecef" />
        <path d="M375 812 C300 770 320 700 375 680 L375 812 Z" fill="#e3f0ef" />
      </svg>

      {onBack && (
        <button
          type="button"
          className="back-btn"
          aria-label="Go back"
          onClick={onBack}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div className="login-content">
        <Logo width={150} />

        <h1 className="welcome-back">Set New Password</h1>
        <p className="login-desc">
          Choose a secure new password for your MindLab account.
        </p>

        {error && (
          <div className="alert-banner error" role="alert">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="alert-banner success" role="status">
            {successMsg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-wrapper">
            <div className={`field ${error ? 'has-error' : ''}`}>
              <svg width="18" height="19" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="10.5"
                  width="14"
                  height="9.5"
                  rx="2.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 10.5V8a4 4 0 018 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password (min 6 chars)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="eye-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <>
                      <path
                        d="M3 3l18 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9.9 5.1A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a17.9 17.9 0 01-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7a10.4 10.4 0 004.3-.9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.9 9.9a3 3 0 004.2 4.2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="field-wrapper">
            <div className={`field ${error ? 'has-error' : ''}`}>
              <svg width="18" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ marginTop: '22px' }}
          >
            {isSubmitting ? (
              <span className="spinner" />
            ) : (
              <>
                Update Password
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="#fff"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="bottom-msg">
          A healthier mind builds<br />
          a brighter future 🌿
        </p>
      </div>

      <div className="home-indicator"></div>
    </div>
  );
}
