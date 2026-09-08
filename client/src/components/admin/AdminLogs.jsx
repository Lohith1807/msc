import React, { useState, useEffect } from 'react';
import { platformAPI } from '../../services/api';
import CustomSelect from '../common/CustomSelect';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await platformAPI.getLogs({
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [categoryFilter, severityFilter]);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'success':
        return 'badge-severity-success';
      case 'warning':
        return 'badge-severity-warning';
      case 'danger':
        return 'badge-severity-danger';
      default:
        return 'badge-severity-info';
    }
  };

  return (
    <div className="admin-module-container">
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Security & Audit</span>
          <h2 className="admin-title">System Activity Logs</h2>
          <p className="admin-subtitle">
            Immutable timestamped record of administrative actions, card edits, logins, and submissions.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadLogs}
          disabled={isLoading}
        >
          ↻ Refresh Logs
        </button>
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
            <label>Search logs</label>
            <input
              type="text"
              placeholder="Search action, details, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Category</label>
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'Auth', label: 'Auth' },
                { value: 'Profile', label: 'Profile' },
                { value: 'Cards', label: 'Cards' },
                { value: 'Questions', label: 'Questions' },
                { value: 'Responses', label: 'Responses' },
                { value: 'Security', label: 'Security' },
                { value: 'System', label: 'System' },
              ]}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Severity</label>
            <CustomSelect
              value={severityFilter}
              onChange={(val) => setSeverityFilter(val)}
              options={[
                { value: '', label: 'All Severities' },
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'danger', label: 'Danger' },
              ]}
            />
          </div>

          <div className="filter-actions-wrap">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={loadLogs}
            >
              Search
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setSeverityFilter('');
                setTimeout(loadLogs, 50);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Logs Stream Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Category</th>
                <th>Details</th>
                <th>Actor</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>📜</span>
                      <p>No activity logs recorded matching criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id || log.id}>
                    <td>
                      <span className="table-date-cell">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="log-action-code">{log.action}</span>
                    </td>
                    <td>
                      <span className="badge-category">{log.category}</span>
                    </td>
                    <td>
                      <p className="log-details-text">{log.details}</p>
                    </td>
                    <td>
                      <div className="log-actor-cell">
                        <strong>{log.userName}</strong>
                        <span className="cell-subtext">{log.userRole}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-severity ${getSeverityBadge(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
