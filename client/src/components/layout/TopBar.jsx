import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { devAPI } from '../../services/api';

export default function TopBar({ onToggleSidebar, isSidebarOpen, activeView, onSelectView }) {
  const { user, role, logout, isDev } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Load dev notifications (poll every 30s)
  const loadNotifications = useCallback(async () => {
    if (!isDev) return;
    try {
      const res = await devAPI.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Silently ignore
    }
  }, [isDev]);

  useEffect(() => {
    if (!isDev) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isDev, loadNotifications]);

  const handleNotifClick = async (notif) => {
    // Mark as read
    try {
      await devAPI.markNotificationRead(notif.id || notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id || n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
    // Navigate to dev logs
    onSelectView('dev-logs');
    setIsNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await devAPI.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getInitials = (name) => {
    if (!name) return 'ML';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleBadgeClass = (userRole) => {
    switch (userRole) {
      case 'admin': return 'badge-admin';
      case 'psychiatrist': return 'badge-psych';
      case 'dev': return 'badge-dev';
      default: return 'badge-user';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'error': return '#f97316';
      case 'warning': return '#eab308';
      default: return '#6b7280';
    }
  };

  const formatNotifTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
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

      {/* Right: Notifications + User Avatar */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Dev Notification Bell (only for dev role) */}
        {isDev && (
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="notif-bell-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              aria-label="Developer notifications"
              title="Dev Error Notifications"
              style={{
                position: 'relative',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary, #6b7280)',
                transition: 'all 0.2s',
              }}
            >
              {/* Bell icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--topbar-bg, #fff)',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '360px',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '14px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  overflow: 'hidden',
                  maxHeight: '480px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #111)' }}>
                      🔔 Dev Alerts
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary, #6b7280)' }}>
                      {unreadCount > 0 ? `${unreadCount} unread error${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      style={{ fontSize: '11px', color: 'var(--cyan, #06b6d4)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 8px' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary, #6b7280)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                      <p style={{ margin: 0, fontSize: '13px' }}>No new errors detected</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id || notif._id}
                        type="button"
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          width: '100%',
                          padding: '12px 20px',
                          background: notif.isRead ? 'transparent' : 'rgba(239,68,68,0.04)',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color, #f3f4f6)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(239,68,68,0.04)'}
                      >
                        {/* Severity dot */}
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: getSeverityColor(notif.severity),
                            marginTop: '5px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: notif.isRead ? 400 : 700, color: 'var(--text-primary, #111)', lineHeight: 1.4 }}>
                            {notif.title}
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary, #6b7280)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {notif.message?.split('\n')[0]}
                          </p>
                          {notif.route && (
                            <code style={{ fontSize: '10px', color: 'var(--cyan, #06b6d4)', background: 'rgba(6,182,212,0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                              {notif.route}
                            </code>
                          )}
                          <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'var(--text-secondary, #9ca3af)' }}>
                            {formatNotifTime(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '5px' }} />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color, #e5e7eb)', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { onSelectView('dev-logs'); setIsNotifOpen(false); }}
                    style={{ fontSize: '12px', color: 'var(--cyan, #06b6d4)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View all Dev Logs →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Avatar & Account Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
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

              <button
                type="button"
                className="account-menu-item"
                onClick={() => { onSelectView('profile'); setIsMenuOpen(false); }}
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
                onClick={() => { onSelectView('cards'); setIsMenuOpen(false); }}
                role="menuitem"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Home
              </button>

              {isDev && (
                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => { onSelectView('dev-logs'); setIsMenuOpen(false); }}
                  role="menuitem"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Dev Logs
                </button>
              )}

              <div className="menu-divider" />

              <button
                type="button"
                className="account-menu-item text-danger"
                onClick={() => { setIsMenuOpen(false); logout(); }}
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
      </div>
    </header>
  );
}
