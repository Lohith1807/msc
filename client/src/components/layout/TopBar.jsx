import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function TopBar({ onToggleSidebar, isSidebarOpen, activeView, onSelectView }) {
  const { user, role, logout, switchRole } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'ML';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeClass = (userRole) => {
    switch (userRole) {
      case 'admin':
        return 'badge-admin';
      case 'psychiatrist':
        return 'badge-psych';
      default:
        return 'badge-user';
    }
  };

  return (
    <header className="topbar">
      {/* Left: Fixed Hamburger Toggle */}
      <div className="topbar-left">
        <button
          type="button"
          className={`hamburger-btn ${isSidebarOpen ? 'is-active' : ''}`}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          aria-expanded={isSidebarOpen}
          id="hamburger-btn"
        >
          <span className="hamburger-line line-1" />
          <span className="hamburger-line line-2" />
          <span className="hamburger-line line-3" />
        </button>

        {/* Brand Title */}
        <div className="topbar-brand" onClick={() => onSelectView('cards')} role="button" tabIndex={0}>
          <h1 className="topbar-title">Welcome to Mind Lab</h1>
        </div>
      </div>

      {/* Right: User Avatar & Account Menu */}
      <div className="topbar-right" ref={menuRef}>
        <button
          type="button"
          className="user-profile-trigger"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="User account menu"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          id="user-menu-trigger"
        >
          <div className="user-avatar-circle">
            {getInitials(user?.name)}
          </div>
          <div className="user-meta-desktop">
            <span className="user-name-text">{user?.name || 'MindLab Member'}</span>
            <span className={`role-badge-pill ${getRoleBadgeClass(role)}`}>
              {role.toUpperCase()}
            </span>
          </div>
          <svg
            className={`chevron-icon ${isMenuOpen ? 'rotate-180' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="account-dropdown-menu" role="menu">
            <div className="account-dropdown-header">
              <div className="avatar-preview-lg">{getInitials(user?.name)}</div>
              <div>
                <p className="account-user-name">{user?.name}</p>
                <p className="account-user-email">{user?.email}</p>
                <span className={`role-badge-pill ${getRoleBadgeClass(role)}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                  Role: {role}
                </span>
              </div>
            </div>

            <div className="menu-divider" />

            <div className="role-switcher-section">
              <p className="role-switcher-title">Switch Persona (Interactive Demo):</p>
              <div className="role-switcher-buttons">
                <button
                  type="button"
                  className={`role-switch-btn ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => {
                    switchRole('admin');
                    setIsMenuOpen(false);
                  }}
                >
                  👑 Admin
                </button>
                <button
                  type="button"
                  className={`role-switch-btn ${role === 'psychiatrist' ? 'active' : ''}`}
                  onClick={() => {
                    switchRole('psychiatrist');
                    setIsMenuOpen(false);
                  }}
                >
                  🩺 Psychiatrist
                </button>
                <button
                  type="button"
                  className={`role-switch-btn ${role === 'user' ? 'active' : ''}`}
                  onClick={() => {
                    switchRole('user');
                    setIsMenuOpen(false);
                  }}
                >
                  👤 User
                </button>
              </div>
            </div>

            <div className="menu-divider" />

            <button
              type="button"
              className="account-menu-item"
              onClick={() => {
                onSelectView('profile');
                setIsMenuOpen(false);
              }}
              role="menuitem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              View Full Profile
            </button>

            <button
              type="button"
              className="account-menu-item"
              onClick={() => {
                onSelectView('cards');
                setIsMenuOpen(false);
              }}
              role="menuitem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Home
            </button>

            <div className="menu-divider" />

            <button
              type="button"
              className="account-menu-item text-danger"
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
              role="menuitem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
