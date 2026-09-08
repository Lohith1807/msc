import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose, activeView, onSelectView }) {
  const { user, role, logout } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    {
      id: 'cards',
      label: 'Home',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      badge: null,
    },
    {
      id: 'profile',
      label: 'My Profile & Info',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      badge: null,
    },
    // Dedicated Admin Card Management CRUD
    ...(role === 'admin'
      ? [
          {
            id: 'admin-cards',
            label: 'Manage Cards',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            badge: 'Admin',
          },
        ]
      : []),
    {
      id: 'responses',
      label: 'User Responses',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      badge: null,
    },
    {
      id: 'users',
      label: 'Total Users',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      badge: null,
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      badge: null,
    },
  ];

  const handleSelect = (viewId) => {
    onSelectView(viewId);
    // On mobile screens, auto-close sidebar after selection
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Semi-transparent Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Off-canvas Drawer */}
      <aside
        className={`sidebar-drawer ${isOpen ? 'is-open' : ''}`}
        id="app-sidebar"
        aria-label="Sidebar navigation"
      >
        {/* Drawer Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand-box">
            <div className="sidebar-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" fill="#fff" />
              </svg>
            </div>
            <div>
              <h2 className="sidebar-brand-title">Mind Lab</h2>
              <span className="sidebar-role-indicator">
                {role === 'admin' ? 'Administrator Portal' : role === 'psychiatrist' ? 'Clinician Portal' : 'Member Portal'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu-list">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <span className="sidebar-nav-text">{item.label}</span>
                    {item.badge && (
                      <span className={`sidebar-badge ${item.badge === 'Admin' ? 'badge-admin-small' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Pinned Logout Area */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <div className="sidebar-user-mini">
            <div className="sidebar-user-avatar">
              {(user?.name || 'M')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name || 'MindLab Member'}</p>
              <p className="sidebar-user-role-tag">{role.toUpperCase()}</p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            aria-label="Log out of application"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
