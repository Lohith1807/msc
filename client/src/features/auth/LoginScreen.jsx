import React, { useState } from 'react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({
  onBack,
  onNavigateSignup,
  onNavigateForgot,
  onLoginSuccess,
}) {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Please enter your password.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    try {
      await login(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setServerError(err.message || 'Invalid email or password.');
      }
    }
  };

  return (
    <div className="screen" id="login">
      {/* Decorative organic shapes from mockup */}
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
          id="backBtn"
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

        <h1 className="welcome-back">Welcome Back!</h1>
        <p className="login-desc">
          Please enter your email and password details to access your account.
        </p>

        {serverError && (
          <div className="alert-banner error" role="alert">
            {serverError}
          </div>
        )}

        <form className="auth-form" id="loginForm" onSubmit={handleSubmit} noValidate>
          <div className="field-wrapper">
            <div className={`field ${errors.email ? 'has-error' : ''}`}>
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
                id="emailInput"
                placeholder="Email Address"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
              />
            </div>
            {errors.email && <span className="field-error-text">{errors.email}</span>}
          </div>

          <div className="field-wrapper">
            <div className={`field ${errors.password ? 'has-error' : ''}`}>
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
                id="passwordInput"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
              />
              <button
                type="button"
                className="eye-toggle"
                id="eyeToggle"
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
            {errors.password && <span className="field-error-text">{errors.password}</span>}
          </div>

          <div className="forgot-row">
            <button
              type="button"
              id="forgotLink"
              onClick={onNavigateForgot}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            id="loginSubmitBtn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner" />
            ) : (
              <>
                Log In
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
          <span>or</span>
          <span className="line"></span>
        </div>

        <button
          type="button"
          className="btn-secondary"
          id="signUpBtn"
          onClick={onNavigateSignup}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M5 19.5c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Sign Up
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
