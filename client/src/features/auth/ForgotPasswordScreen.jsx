import React, { useState } from 'react';
import Logo from './Logo';
import { authAPI } from '../../services/api';

export default function ForgotPasswordScreen({
  onBack,
  onNavigateLogin,
  onNavigateReset,
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [devResetToken, setDevResetToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await authAPI.forgotPassword({ email: email.trim() });
      setStatusMessage(data.message);
      if (data.devResetToken) {
        setDevResetToken(data.devResetToken);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen" id="forgot-password">
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
          id="forgotBackBtn"
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

        <h1 className="welcome-back">Reset Password</h1>
        <p className="login-desc">
          Enter your email address and we will help you recover access to your account.
        </p>

        {error && (
          <div className="alert-banner error" role="alert">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="alert-banner success" role="status">
            {statusMessage}
          </div>
        )}

        {devResetToken && onNavigateReset && (
          <div
            style={{
              width: '100%',
              maxWidth: '320px',
              marginTop: '12px',
              padding: '12px',
              background: '#f0f9fa',
              borderRadius: '14px',
              border: '1.5px dashed var(--cyan)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '12.5px', color: 'var(--navy-deep)', marginBottom: '8px' }}>
              🛠️ <strong>Dev Mode Link:</strong> Reset token generated.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ height: '42px', fontSize: '14px' }}
              onClick={() => onNavigateReset(devResetToken)}
            >
              Continue to Reset Form →
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-wrapper">
            <div className={`field ${error ? 'has-error' : ''}`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M4 6.5l8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="email"
                id="forgotEmailInput"
                placeholder="Email Address"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            id="forgotSubmitBtn"
            disabled={isSubmitting}
            style={{ marginTop: '22px' }}
          >
            {isSubmitting ? (
              <span className="spinner" />
            ) : (
              <>
                Send Instructions
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

        <div className="divider">
          <span className="line"></span>
          <span>remember your password?</span>
          <span className="line"></span>
        </div>

        <button
          type="button"
          className="btn-secondary"
          id="forgotBackToLoginBtn"
          onClick={onNavigateLogin}
        >
          Back to Log In
        </button>

        <p className="bottom-msg">
          A healthier mind builds<br />
          a brighter future 🌿
        </p>
      </div>

      <div className="home-indicator"></div>
    </div>
  );
}
