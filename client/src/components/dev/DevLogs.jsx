import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { devAPI } from '../../services/api';
import CustomSelect from '../common/CustomSelect';

// --- DSA: useMemo for O(1) severity → display mapping ---
const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  error: { label: 'ERROR', color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: '🟠' },
  warning: { label: 'WARNING', color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: '🟡' },
};

const STATUS_CONFIG = {
  new: { label: 'New', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  read: { label: 'Read', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  resolved: { label: 'Resolved', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.error;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 700, letterSpacing: '0.5px',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

function DevLogDetailModal({ log, onClose, onStatusUpdated }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateStatus = async (status) => {
    setIsUpdating(true);
    try {
      const res = await devAPI.updateLogStatus(log.id || log._id, status);
      if (res.success) {
        onStatusUpdated(log.id || log._id, status);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this dev log permanently?')) return;
    setIsDeleting(true);
    try {
      await devAPI.deleteLog(log.id || log._id);
      onStatusUpdated(log.id || log._id, '__deleted__');
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete log');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--card-bg, #fff)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '780px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          margin: 'auto',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border-color, #e5e7eb)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(0,0,0,0) 100%)',
        }}>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
              <SeverityBadge severity={log.severity} />
              <StatusBadge status={log.status} />
              <code style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-subtle, #f9fafb)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                #{log.logId}
              </code>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #111)' }}>
              {log.errorType}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>
              Dev Log Detail
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '4px', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Key Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Error Type', value: log.errorType },
              { label: 'HTTP Status', value: log.httpStatus || 'N/A' },
              { label: 'Method', value: log.method || 'N/A' },
              { label: 'Occurrences', value: log.occurrences ?? 1 },
              { label: 'First Seen', value: log.firstSeenAt ? new Date(log.firstSeenAt).toLocaleString() : '—' },
              { label: 'Last Seen', value: log.lastSeenAt ? new Date(log.lastSeenAt).toLocaleString() : '—' },
              { label: 'User Role', value: log.userRole || 'Anonymous' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-subtle, #f9fafb)', borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary, #9ca3af)' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #111)', wordBreak: 'break-word' }}>{String(value)}</p>
              </div>
            ))}
          </div>

          {/* Route */}
          {log.route && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Route</p>
              <code style={{ display: 'block', padding: '10px 14px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', fontSize: '13px', color: 'var(--cyan, #06b6d4)', wordBreak: 'break-all', border: '1px solid var(--border-color, #e5e7eb)' }}>
                {log.method && <span style={{ color: '#f97316', marginRight: '8px' }}>[{log.method}]</span>}
                {log.route}
              </code>
            </div>
          )}

          {/* Error Message */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Error Message</p>
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary, #111)', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {log.message}
            </div>
          </div>

          {/* Stack Trace */}
          {log.stackTrace && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Stack Trace</p>
              <pre style={{
                margin: 0, padding: '14px 16px',
                background: '#0f1117', color: '#e2e8f0',
                borderRadius: '10px', fontSize: '11px',
                overflowX: 'auto', lineHeight: 1.7,
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '300px',
              }}>
                {log.stackTrace}
              </pre>
            </div>
          )}

          {/* Context */}
          {log.context && Object.keys(log.context).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Context</p>
              <pre style={{
                margin: 0, padding: '14px 16px',
                background: 'var(--bg-subtle, #f9fafb)',
                borderRadius: '10px', fontSize: '11px',
                overflowX: 'auto', lineHeight: 1.7,
                fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-color, #e5e7eb)',
                color: 'var(--text-primary, #111)',
                maxHeight: '200px',
              }}>
                {JSON.stringify(log.context, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--border-color, #e5e7eb)',
          display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {log.status !== 'resolved' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleUpdateStatus('resolved')}
                disabled={isUpdating}
                style={{ fontSize: '13px', padding: '8px 18px' }}
              >
                ✓ Mark Resolved
              </button>
            )}
            {log.status === 'new' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleUpdateStatus('read')}
                disabled={isUpdating}
                style={{ fontSize: '13px', padding: '8px 18px' }}
              >
                Mark Read
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ fontSize: '13px', padding: '8px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              🗑 Delete
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ fontSize: '13px', padding: '8px 18px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Summary stats
  const [newCount, setNewCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await devAPI.getLogs({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        errorType: errorTypeFilter || undefined,
        search: searchQuery || undefined,
        limit: 200,
      });
      if (res.success) {
        setLogs(res.logs || []);
        setNewCount(res.newCount || 0);
        setCriticalCount(res.criticalCount || 0);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load dev logs');
    } finally {
      setIsLoading(false);
    }
  }, [severityFilter, statusFilter, errorTypeFilter, searchQuery]);

  useEffect(() => {
    loadLogs();
  }, [severityFilter, statusFilter, errorTypeFilter]);

  const handleStatusUpdated = (logId, newStatus) => {
    if (newStatus === '__deleted__') {
      setLogs((prev) => prev.filter((l) => (l.id || l._id) !== logId));
    } else {
      setLogs((prev) =>
        prev.map((l) => ((l.id || l._id) === logId ? { ...l, status: newStatus } : l))
      );
    }
  };

  const handleViewLog = async (log) => {
    try {
      // Fetch full detail (includes stackTrace + context)
      const res = await devAPI.getLogDetail(log.id || log._id);
      if (res.success) {
        setSelectedLog(res.log);
        // Update status in list if it changed to 'read'
        if (res.log.status !== log.status) {
          handleStatusUpdated(log.id || log._id, res.log.status);
        }
      }
    } catch {
      setSelectedLog(log); // Fallback to partial data
    }
  };

  const handleClearResolved = async () => {
    if (!window.confirm('Clear all resolved logs?')) return;
    try {
      const res = await devAPI.clearResolvedLogs();
      if (res.success) {
        setLogs((prev) => prev.filter((l) => l.status !== 'resolved'));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to clear resolved logs');
    }
  };

  // DSA: useMemo to compute filtered count without re-iterating
  const filteredCount = useMemo(() => logs.length, [logs]);

  return (
    <div className="admin-module-container">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Developer Tools</span>
          <h2 className="admin-title">Dev Logs</h2>
          <p className="admin-subtitle">
            Real-time automatic error capture — database failures, 500 errors, API exceptions, and frontend crashes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-secondary" onClick={handleClearResolved} style={{ fontSize: '13px' }}>
            Clear Resolved
          </button>
          <button type="button" className="btn-secondary" onClick={loadLogs} disabled={isLoading} style={{ fontSize: '13px' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Logs', value: filteredCount, color: '#6b7280' },
          { label: 'New/Unread', value: newCount, color: '#3b82f6' },
          { label: 'Critical Active', value: criticalCount, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: '12px', padding: '12px 20px',
            display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '120px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="alert-banner alert-error">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="admin-filter-bar">
        <div className="filter-form-grid">
          <div className="filter-input-wrap">
            <label>Search</label>
            <input
              type="text"
              placeholder="message, route, error type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Severity</label>
            <CustomSelect
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                { value: '', label: 'All Severities' },
                { value: 'critical', label: '🔴 Critical' },
                { value: 'error', label: '🟠 Error' },
                { value: 'warning', label: '🟡 Warning' },
              ]}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'new', label: 'New' },
                { value: 'read', label: 'Read' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Error Type</label>
            <CustomSelect
              value={errorTypeFilter}
              onChange={setErrorTypeFilter}
              options={[
                { value: '', label: 'All Types' },
                { value: 'DatabaseError', label: 'Database Error' },
                { value: 'ServerError', label: 'Server Error' },
                { value: 'AuthError', label: 'Auth Error' },
                { value: 'APIError', label: 'API Error' },
                { value: 'ValidationError', label: 'Validation Error' },
                { value: 'FrontendError', label: 'Frontend Error' },
                { value: 'NetworkError', label: 'Network Error' },
                { value: 'UnhandledError', label: 'Unhandled Error' },
              ]}
            />
          </div>

          <div className="filter-actions-wrap">
            <button type="button" className="btn-primary btn-sm" onClick={loadLogs}>Search</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => {
              setSearchQuery(''); setSeverityFilter(''); setStatusFilter(''); setErrorTypeFilter('');
              setTimeout(loadLogs, 50);
            }}>Reset</button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Severity</th>
                <th>Error Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Route</th>
                <th>Method</th>
                <th style={{ textAlign: 'center' }}>×</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="spinner" style={{ borderTopColor: '#ef4444', margin: '0 auto' }} />
                    <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading dev logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="empty-table-state">
                      <span style={{ fontSize: '40px' }}>✅</span>
                      <p>No errors found — system is healthy!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || log._id} style={{ opacity: log.status === 'resolved' ? 0.65 : 1 }}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>{idx + 1}</td>
                    <td><SeverityBadge severity={log.severity} /></td>
                    <td>
                      <code style={{ fontSize: '11px', color: 'var(--text-primary)', background: 'var(--bg-subtle, #f9fafb)', padding: '2px 6px', borderRadius: '4px' }}>
                        {log.errorType}
                      </code>
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                        {log.message}
                      </p>
                    </td>
                    <td><StatusBadge status={log.status} /></td>
                    <td>
                      {log.route ? (
                        <code style={{ fontSize: '11px', color: 'var(--cyan, #06b6d4)', maxWidth: '150px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.route}>
                          {log.route}
                        </code>
                      ) : <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>}
                    </td>
                    <td>
                      {log.method ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#f97316' }}>{log.method}</span>
                      ) : <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', minWidth: '28px',
                        padding: '2px 8px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: 700,
                        background: log.occurrences > 1 ? 'rgba(249,115,22,0.12)' : 'var(--bg-subtle)',
                        color: log.occurrences > 1 ? '#f97316' : 'var(--text-secondary)',
                      }}>
                        {log.occurrences ?? 1}
                      </span>
                    </td>
                    <td>
                      <span className="table-date-cell" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt || log.lastSeenAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => handleViewLog(log)}
                        style={{ fontSize: '11px', padding: '5px 12px', whiteSpace: 'nowrap' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <DevLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
