import React, { useState, useEffect } from 'react';
import { platformAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import CustomSelect from '../common/CustomSelect';

export default function AdminUsers({ onUsersUpdated }) {
  const { role: currentUserRole } = useAuth();
  const isDev = currentUserRole === 'dev';
  const canManageRoles = currentUserRole === 'admin' || currentUserRole === 'dev';
  const { confirm, toast } = useDialog();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await platformAPI.getUsers({
        search: searchQuery || undefined,
        role: roleFilter || undefined,
      });
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load user directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await platformAPI.updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      setSuccessMessage(`User role updated to ${newRole}`);
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to update user role');
      setErrorMessage(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const isConfirmed = await confirm({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
      confirmText: 'Delete User',
      variant: 'danger',
    });
    if (!isConfirmed) {
      return;
    }
    try {
      await platformAPI.deleteUser(userId);
      toast.success(`User "${userName}" deleted successfully.`);
      setSuccessMessage(`User "${userName}" deleted successfully.`);
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
      setErrorMessage(err.message || 'Failed to delete user');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password) {
      setModalError('Please fill in all required fields.');
      return;
    }
    if (newUserData.password.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }
    setIsSubmittingUser(true);
    try {
      await platformAPI.createUser(newUserData);
      toast.success(`User "${newUserData.name}" created successfully!`);
      setSuccessMessage(`User "${newUserData.name}" created successfully!`);
      setIsAddUserModalOpen(false);
      setNewUserData({ name: '', email: '', password: '', role: 'user' });
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to create user account.');
      setModalError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  return (
    <div className="admin-module-container">
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Access & Directory</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="admin-title">Registered Users Directory</h2>
            <span className="count-badge-pill">{users.length} Accounts</span>
          </div>
          <p className="admin-subtitle">
            Manage user accounts, roles (Admin, Psychiatrist, User), and participation metrics.
          </p>
        </div>
        <div className="admin-header-actions-group">
          <button
            type="button"
            className="btn-header-half btn-refresh"
            onClick={loadUsers}
            disabled={isLoading}
            title="Refresh Directory"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn-header-half btn-add-user"
            onClick={() => {
              setModalError('');
              setNewUserData({ name: '', email: '', password: '', role: 'user' });
              setIsAddUserModalOpen(true);
            }}
            title="Add New User Account"
          >
            + Add User
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="alert-banner alert-success">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="alert-banner alert-error">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="filter-form-grid">
          <div className="filter-input-wrap">
            <label>Search user name or email</label>
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Filter by Role</label>
            <CustomSelect
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'psychiatrist', label: 'Psychiatrist' },
                { value: 'user', label: 'User' },
                ...(isDev ? [{ value: 'dev', label: 'Dev' }] : []),
              ]}
            />
          </div>

          <div className="filter-actions-wrap">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={loadUsers}
            >
              Search
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('');
                setTimeout(loadUsers, 50);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Assigned Role</th>
                <th>Submitted Reflections</th>
                <th>Joined Date</th>
                {canManageRoles && <th>Role Management</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canManageRoles ? 5 : 4} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <p>Loading registered accounts...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={canManageRoles ? 5 : 4} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>👥</span>
                      <p>No user accounts found matching this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                <tr key={u._id || u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-xs">
                        {(u.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <strong>{u.name}</strong>
                        <p className="cell-subtext">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge-pill badge-${u.role}`}>
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="responses-count-badge">
                      {u.responsesCount || 0} reflections
                    </span>
                  </td>
                  <td>
                    <span className="table-date-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  {canManageRoles && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CustomSelect
                          className="role-selector-inline"
                          value={u.role}
                          onChange={(val) => handleRoleChange(u._id || u.id, val)}
                          options={[
                            { value: 'user', label: 'User' },
                            { value: 'psychiatrist', label: 'Psychiatrist' },
                            { value: 'admin', label: 'Admin' },
                            // 'dev' role option only visible to dev users
                            ...(isDev ? [{ value: 'dev', label: 'Dev' }] : []),
                          ]}
                        />
                        {/* Protect seed accounts from deletion */}
                        {u.email !== 'lohithreddy1819@gmail.com' && u.email !== 'lohithreddy18april@gmail.com' && (
                          <button
                            type="button"
                            className="btn-delete-user"
                            title={`Delete ${u.name}`}
                            onClick={() => handleDeleteUser(u._id || u.id, u.name)}
                            style={{
                              padding: '6px 10px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              lineHeight: 1
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="card-modal-backdrop" onClick={() => !isSubmittingUser && setIsAddUserModalOpen(false)}>
          <div className="card-modal-container modal-admin-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="card-modal-header">
              <div>
                <span className="admin-tag-label">Account Provisioning</span>
                <h3 className="modal-title" style={{ margin: '4px 0 0' }}>Add New User Account</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => !isSubmittingUser && setIsAddUserModalOpen(false)}
                disabled={isSubmittingUser}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="alert-banner alert-error" style={{ margin: '16px 24px 0' }}>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="admin-form-body">
              <div className="form-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jordan Hayes"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  disabled={isSubmittingUser}
                />
              </div>

              <div className="form-field">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jordan@mindlab.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  disabled={isSubmittingUser}
                />
              </div>

              <div className="form-field">
                <label>Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  disabled={isSubmittingUser}
                />
              </div>

              <div className="form-field">
                <label>Assigned Role *</label>
                <CustomSelect
                  value={newUserData.role}
                  onChange={(val) => setNewUserData({ ...newUserData, role: val })}
                  options={[
                    { value: 'user', label: 'User (Standard Access)' },
                    { value: 'psychiatrist', label: 'Psychiatrist (Clinical Review)' },
                    { value: 'admin', label: 'Admin (Full Management)' },
                    // 'dev' role only assignable by dev users
                    ...(isDev ? [{ value: 'dev', label: 'Dev (Developer Access)' }] : []),
                  ]}
                  disabled={isSubmittingUser}
                />
              </div>

              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddUserModalOpen(false)}
                  disabled={isSubmittingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingUser}
                >
                  {isSubmittingUser ? 'Creating Account...' : '+ Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
