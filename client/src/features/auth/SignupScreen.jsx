import React, { useState } from 'react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function SignupScreen({
  onBack,
  onNavigateLogin,
  onSignupSuccess,
}) {
  const { register, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Please enter your full name.';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errs.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Please enter a password.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
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
      await register(name.trim(), email.trim(), password);
      if (onSignupSuccess) {
        onSignupSuccess();
      }
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setServerError(err.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="screen" id="signup">
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
          id="signupBackBtn"
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
        <Logo width={140} />

        <h1 className="welcome-back">Create Account</h1>
        <p className="login-desc">
          Begin your journey to emotional well-being and mindful growth.
        </p>

        {serverError && (
          <div className="alert-banner error" role="alert">
            {serverError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-wrapper">
            <div className={`field ${errors.name ? 'has-error' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                id="nameInput"
                placeholder="Full Name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
              />
            </div>
            {errors.name && <span className="field-error-text">{errors.name}</span>}
          </div>

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
                id="signupEmailInput"
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
                id="signupPasswordInput"
                placeholder="Password (min. 6 characters)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
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
            {errors.password && <span className="field-error-text">{errors.password}</span>}
          </div>

          <div className="field-wrapper">
            <div className={`field ${errors.confirmPassword ? 'has-error' : ''}`}>
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
                id="confirmPasswordInput"
                placeholder="Confirm Password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }}
              />
            </div>
            {errors.confirmPassword && (
              <span className="field-error-text">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            id="signupSubmitBtn"
            disabled={isLoading}
            style={{ marginTop: '22px' }}
          >
            {isLoading ? (
              <span className="spinner" />
            ) : (
              <>
                Sign Up
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
          <span>already have an account?</span>
          <span className="line"></span>
        </div>

        <button
          type="button"
          className="btn-secondary"
          id="signupLoginBtn"
          onClick={onNavigateLogin}
        >
          Log In
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
