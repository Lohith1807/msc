import React, { useState, useEffect } from 'react';
import { platformAPI } from '../../services/api';
import CustomSelect from '../common/CustomSelect';

export default function AdminResponses() {
  const [responses, setResponses] = useState([]);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedCard, setSelectedCard] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [respData, cardData] = await Promise.all([
        platformAPI.getResponses({
          cardId: selectedCard || undefined,
          search: searchQuery || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        platformAPI.getCards(true),
      ]);

      if (respData.success) {
        setResponses(respData.responses || []);
      }
      if (cardData.success) {
        setCards(cardData.cards || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCard, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setSelectedCard('');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setTimeout(loadData, 50);
  };

  return (
    <div className="admin-module-container">
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">User Interactions</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="admin-title">User Responses Feed</h2>
            <span className="count-badge-pill">{responses.length} Reflections</span>
          </div>
          <p className="admin-subtitle">
            Audit and filter submissions gathered across 0°, 90°, 180°, and 270° card rotations.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadData}
          disabled={isLoading}
        >
          ↻ Refresh Feed
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
        <form onSubmit={handleSearchSubmit} className="filter-form-grid">
          <div className="filter-input-wrap">
            <label>Search keyword / user</label>
            <input
              type="text"
              placeholder="Search user name or response..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-input-wrap">
            <label>Filter by Card</label>
            <CustomSelect
              value={selectedCard}
              onChange={(val) => setSelectedCard(val)}
              options={[
                { value: '', label: 'All Cards' },
                ...cards.map((c) => ({ value: c._id || c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="filter-input-wrap">
            <label>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="filter-input-wrap">
            <label>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="filter-actions-wrap">
            <button type="submit" className="btn-primary btn-sm">
              Apply
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Responses Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Card</th>
                <th>Rotation Angle</th>
                <th>Question Prompt</th>
                <th>Recorded Answer</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {responses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-table-state">
                      <span>💭</span>
                      <p>No user responses found matching these criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                responses.map((resp) => (
                  <tr key={resp._id || resp.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar-xs">
                          {(resp.userName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <strong>{resp.userName}</strong>
                          <p className="cell-subtext">{resp.userEmail || 'Guest'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-card-name">{resp.cardName}</span>
                    </td>
                    <td>
                      <span className="badge-rotation-angle">
                        {resp.rotationLabel || `${resp.rotationAngle}°`}
                      </span>
                    </td>
                    <td>
                      <p className="table-prompt-cell" title={resp.questionText}>
                        {resp.questionText}
                      </p>
                    </td>
                    <td>
                      <div className="table-answer-cell">
                        <strong>"{resp.answer}"</strong>
                      </div>
                    </td>
                    <td>
                      <span className="table-date-cell">
                        {new Date(resp.createdAt).toLocaleString()}
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
