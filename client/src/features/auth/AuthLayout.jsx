import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import WelcomeScreen from './WelcomeScreen';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import './auth.css';

export default function AuthLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token: routeToken } = useParams();

  // Determine active view based on path
  const getViewFromPath = () => {
    const path = location.pathname;
    if (path === '/signup') return 'signup';
    if (path === '/forgot-password') return 'forgot';
    if (path.startsWith('/reset-password')) return 'reset';
    if (path === '/login') return 'login';
    if (path === '/welcome') return 'welcome';
    return 'welcome'; // default root
  };

  const [activeView, setActiveView] = useState(getViewFromPath);
  const [resetToken, setResetToken] = useState(routeToken || null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setActiveView(getViewFromPath());
    if (routeToken) {
      setResetToken(routeToken);
    }
  }, [location.pathname, routeToken]);

  const isDesktop = windowWidth >= 901;

  const goTo = (view, extraToken = null) => {
    setActiveView(view);
    if (extraToken) setResetToken(extraToken);

    switch (view) {
      case 'welcome':
        navigate('/welcome');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'signup':
        navigate('/signup');
        break;
      case 'forgot':
        navigate('/forgot-password');
        break;
      case 'reset':
        navigate(extraToken ? `/reset-password/${extraToken}` : '/reset-password/token');
        break;
      default:
        navigate('/login');
    }
  };

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  // Render the current active form component
  const renderAuthForm = () => {
    switch (activeView) {
      case 'signup':
        return (
          <SignupScreen
            onBack={() => goTo('login')}
            onNavigateLogin={() => goTo('login')}
            onSignupSuccess={handleAuthSuccess}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onBack={() => goTo('login')}
            onNavigateLogin={() => goTo('login')}
            onNavigateReset={(tok) => goTo('reset', tok)}
          />
        );
      case 'reset':
        return (
          <ResetPasswordScreen
            token={resetToken}
            onBack={() => goTo('login')}
            onNavigateLogin={() => goTo('login')}
            onResetSuccess={handleAuthSuccess}
          />
        );
      case 'welcome':
      case 'login':
      default:
        return (
          <LoginScreen
            onBack={isDesktop ? null : () => goTo('welcome')}
            onNavigateSignup={() => goTo('signup')}
            onNavigateForgot={() => goTo('forgot')}
            onLoginSuccess={handleAuthSuccess}
          />
        );
    }
  };

  const isWelcome = activeView === 'welcome';

  return (
    <div className="auth-wrapper">
      {/* ============ DESKTOP FULL-SCREEN EDGE-TO-EDGE (≥901px) ============ */}
      {isDesktop ? (
        <div className="auth-card-desktop">
          <div className="auth-card-left">
            <WelcomeScreen onGetStarted={() => goTo('login')} isEmbedded={true} />
          </div>
          <div className="auth-card-right">
            <div
              key={activeView}
              className="auth-form-enter"
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {renderAuthForm()}
            </div>
          </div>
        </div>
      ) : (
        /* ============ TABLET & MOBILE (<901px) WITH SMOOTH SLIDER ============ */
        <div className="stage">
          <div className="phone" id="phone-main">
            {/* Welcome Screen Slide */}
            <div
              className={`screen-slide ${
                isWelcome ? 'welcome-active' : 'welcome-exit'
              }`}
            >
              <WelcomeScreen onGetStarted={() => goTo('login')} />
            </div>

            {/* Auth Screen Slide */}
            <div
              className={`screen-slide ${
                !isWelcome ? 'auth-active' : 'auth-exit'
              }`}
            >
              <div key={activeView} className="auth-form-enter" style={{ height: '100%' }}>
                {renderAuthForm()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
