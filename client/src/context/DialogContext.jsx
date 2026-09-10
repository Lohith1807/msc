import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import './dialog.css';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolveRef = useRef(null);

  // Alert Modal State
  const [alertState, setAlertState] = useState(null);
  const alertResolveRef = useRef(null);

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // --- Confirm Dialog ---
  const confirm = useCallback(
    ({
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'danger', // 'danger' | 'warning' | 'primary' | 'info'
    }) => {
      return new Promise((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmState({
          title,
          message,
          confirmText,
          cancelText,
          variant,
        });
      });
    },
    []
  );

  const handleConfirmAction = () => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
    setConfirmState(null);
  };

  const handleCancelAction = () => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
    setConfirmState(null);
  };

  // --- Alert Modal ---
  const showAlertModal = useCallback(
    ({
      title = 'Notice',
      message = '',
      okText = 'OK',
      type = 'info', // 'info' | 'success' | 'warning' | 'error'
    }) => {
      return new Promise((resolve) => {
        alertResolveRef.current = resolve;
        setAlertState({
          title,
          message,
          okText,
          type,
        });
      });
    },
    []
  );

  const handleAlertClose = () => {
    if (alertResolveRef.current) {
      alertResolveRef.current(true);
      alertResolveRef.current = null;
    }
    setAlertState(null);
  };

  // --- Toast Popups ---
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, title = '', type = 'info', duration = 3500 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, message, title, type };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message, title = '') => addToast({ message, title, type: 'success' }),
    error: (message, title = '') => addToast({ message, title, type: 'error' }),
    warning: (message, title = '') => addToast({ message, title, type: 'warning' }),
    info: (message, title = '') => addToast({ message, title, type: 'info' }),
  };

  // Replace native browser window.alert so document alerts never show up!
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlertModal({
        title: 'Alert',
        message: String(msg || ''),
        type: 'info',
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlertModal]);

  // Handle Escape key on active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmState) {
          handleCancelAction();
        } else if (alertState) {
          handleAlertClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, alertState]);

  return (
    <DialogContext.Provider
      value={{
        confirm,
        alert: showAlertModal,
        toast,
      }}
    >
      {children}

      {/* 1. Confirmation Modal Popup */}
      {confirmState && (
        <div
          className="app-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={handleCancelAction}
        >
          <div
            className="app-dialog-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="app-dialog-close-btn"
              onClick={handleCancelAction}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="app-dialog-header">
              <div className={`app-dialog-icon-circle ${confirmState.variant}`}>
                {confirmState.variant === 'danger' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                ) : confirmState.variant === 'warning' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              <div className="app-dialog-content">
                <h3 className="app-dialog-title">{confirmState.title}</h3>
                <p className="app-dialog-message">{confirmState.message}</p>
              </div>
            </div>

            <div className="app-dialog-actions">
              <button
                type="button"
                className="app-dialog-btn-cancel"
                onClick={handleCancelAction}
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                className={`app-dialog-btn-confirm ${confirmState.variant}`}
                onClick={handleConfirmAction}
                autoFocus
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Alert Modal Popup */}
      {alertState && (
        <div
          className="app-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={handleAlertClose}
        >
          <div
            className="app-dialog-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="app-dialog-close-btn"
              onClick={handleAlertClose}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="app-dialog-header">
              <div className={`app-dialog-icon-circle ${alertState.type}`}>
                {alertState.type === 'error' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ) : alertState.type === 'success' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              <div className="app-dialog-content">
                <h3 className="app-dialog-title">{alertState.title}</h3>
                <p className="app-dialog-message">{alertState.message}</p>
              </div>
            </div>

            <div className="app-dialog-actions">
              <button
                type="button"
                className="app-dialog-btn-confirm primary"
                onClick={handleAlertClose}
                autoFocus
              >
                {alertState.okText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating In-Application Toast Popups */}
      {toasts.length > 0 && (
        <div className="app-toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`app-toast-card ${t.type}`} role="alert">
              <div className="app-toast-icon">
                {t.type === 'success' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                )}
                {t.type === 'error' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                {t.type === 'warning' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
                {t.type === 'info' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>

              <div className="app-toast-body">
                {t.title && <div className="app-toast-title">{t.title}</div>}
                <div className="app-toast-message">{t.message}</div>
              </div>

              <button
                type="button"
                className="app-toast-dismiss"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
