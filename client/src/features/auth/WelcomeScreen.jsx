import React from 'react';
import Logo from './Logo';
import getStartedBg from '../../assets/getstarted.png';

export default function WelcomeScreen({ onGetStarted, isEmbedded = false }) {
  return (
    <div className="screen" id="welcome">
      {/* Illustrated background */}
      <img
        className="welcome-bg"
        src={getStartedBg}
        alt="Person sitting on a hilltop overlooking a peaceful mountain lake at sunrise"
      />

      <div className="welcome-content">
        <Logo width={190} />
        <p className="welcome-desc">
          Your personal space for better mental health, self-discovery and emotional well-being.
        </p>
      </div>

      <div className="welcome-spacer"></div>

      <div className="welcome-bottom">
        {!isEmbedded && (
          <button
            type="button"
            className="btn-primary"
            id="getStartedBtn"
            onClick={onGetStarted}
          >
            Get Started
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="mind-matters">
          <span className="line"></span>
          <span>Your mind matters</span>
          <span className="line"></span>
        </div>
      </div>

      <div className="home-indicator"></div>
    </div>
  );
}
