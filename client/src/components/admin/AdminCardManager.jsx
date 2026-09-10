import React, { useState, useEffect } from 'react';
import { platformAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';
import CustomSelect from '../common/CustomSelect';

const ROTATION_OPTIONS = [
  { value: 0, label: 'Front (0°)' },
  { value: 90, label: 'Right (90°)' },
  { value: 180, label: 'Back / Inverted (180°)' },
  { value: 270, label: 'Left (270°)' },
];

const DEFAULT_CARD_GRADIENT = 'linear-gradient(135deg, #1c3a52 0%, #2a9fb0 100%)';

export default function AdminCardManager({ onCardsUpdated }) {
  const { confirm, toast } = useDialog();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Card Modal (Create / Edit)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Mindfulness',
    imageUrl: '',
    gradient: DEFAULT_CARD_GRADIENT,
    description: '',
    status: 'active',
  });

  // Question Modal (Add / Edit question mapped to rotation)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedCardForQuestions, setSelectedCardForQuestions] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    rotation: 0,
    prompt: '',
    questionType: 'multiple_choice',
    optionsText: '',
  });

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const res = await platformAPI.getCards(true);
      if (res.success) {
        setCards(res.cards || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const openCreateCardModal = () => {
    setEditingCard(null);
    setFormData({
      name: '',
      category: 'Mindfulness',
      imageUrl: '',
      gradient: DEFAULT_CARD_GRADIENT,
      description: '',
      status: 'active',
    });
    setIsCardModalOpen(true);
  };

  const openEditCardModal = (card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      category: card.category,
      imageUrl: card.imageUrl || '',
      gradient: card.gradient || DEFAULT_CARD_GRADIENT,
      description: card.description || '',
      status: card.status || 'active',
    });
    setIsCardModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCard) {
        await platformAPI.updateCard(editingCard._id || editingCard.id, formData);
        setSuccessMessage(`Card "${formData.name}" updated successfully!`);
      } else {
        await platformAPI.createCard({
          ...formData,
          questions: [
            { rotation: 0, prompt: 'Reflect on your primary intention for this card.', questionType: 'text_journal', options: [] },
            { rotation: 90, prompt: 'Rate your alignment with this card from 1 to 10.', questionType: 'scale_1_10', options: [] },
            { rotation: 180, prompt: 'What barrier prevents you from mastering this habit?', questionType: 'text_journal', options: [] },
            { rotation: 270, prompt: 'Choose a direct action step:', questionType: 'multiple_choice', options: ['Plan ahead', 'Discuss with therapist', 'Practice daily', 'Review notes'] },
          ],
        });
        setSuccessMessage(`Card "${formData.name}" created successfully!`);
        toast.success(`Card "${formData.name}" created successfully!`);
      }
      setIsCardModalOpen(false);
      loadCards();
      if (onCardsUpdated) onCardsUpdated();
    } catch (err) {
      toast.error(err.message || 'Error saving card');
      setErrorMessage(err.message || 'Error saving card');
    }
  };

  const handleDeleteCard = async (card) => {
    const isConfirmed = await confirm({
      title: 'Permanently Delete Card',
      message: `Are you sure you want to permanently delete "${card.name}"? This action cannot be undone.`,
      confirmText: 'Delete Card',
      variant: 'danger',
    });
    if (!isConfirmed) {
      return;
    }
    try {
      await platformAPI.deleteCard(card._id || card.id);
      toast.success(`Card "${card.name}" deleted.`);
      setSuccessMessage(`Card "${card.name}" deleted.`);
      loadCards();
      if (onCardsUpdated) onCardsUpdated();
    } catch (err) {
      toast.error(err.message || 'Error deleting card');
      setErrorMessage(err.message || 'Error deleting card');
    }
  };

  const handleToggleStatus = async (card) => {
    const cardId = card._id || card.id;
    const newStatus = card.status === 'active' ? 'inactive' : 'active';
    // Optimistic update in table
    setCards((prev) =>
      prev.map((c) => ((c._id || c.id) === cardId ? { ...c, status: newStatus } : c))
    );
    try {
      await platformAPI.updateCard(cardId, { status: newStatus });
      toast.success(`Card marked as ${newStatus}.`);
      setSuccessMessage(`Card marked as ${newStatus}.`);
      loadCards();
      if (onCardsUpdated) onCardsUpdated();
    } catch (err) {
      toast.error(err.message || 'Error updating status');
      setErrorMessage(err.message || 'Error updating status');
      loadCards();
    }
  };

  // Manage Questions for a Card
  const openQuestionsManager = (card) => {
    setSelectedCardForQuestions(card);
  };

  const openAddQuestionModal = (card) => {
    setSelectedCardForQuestions(card);
    setEditingQuestion(null);
    setQuestionFormData({
      rotation: 0,
      prompt: '',
      questionType: 'multiple_choice',
      optionsText: '',
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestionModal = (card, question) => {
    setSelectedCardForQuestions(card);
    setEditingQuestion(question);
    setQuestionFormData({
      rotation: question.rotation,
      prompt: question.prompt,
      questionType: question.questionType,
      optionsText: (question.options || []).join('\n'),
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionFormData.prompt.trim()) return;

    const payload = {
      rotation: Number(questionFormData.rotation),
      prompt: questionFormData.prompt.trim(),
      questionType: questionFormData.questionType,
      options: questionFormData.optionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingQuestion) {
        await platformAPI.updateQuestion(
          selectedCardForQuestions._id || selectedCardForQuestions.id,
          editingQuestion._id,
          payload
        );
        setSuccessMessage('Question updated successfully!');
        toast.success('Question updated successfully!');
      } else {
        await platformAPI.addQuestion(
          selectedCardForQuestions._id || selectedCardForQuestions.id,
          payload
        );
        setSuccessMessage('Question mapped to rotation angle successfully!');
        toast.success('Question mapped to rotation angle successfully!');
      }

      setIsQuestionModalOpen(false);
      // Reload cards and update selected card reference
      const res = await platformAPI.getCards(true);
      if (res.success) {
        setCards(res.cards || []);
        const updated = res.cards.find(
          (c) => (c._id || c.id) === (selectedCardForQuestions._id || selectedCardForQuestions.id)
        );
        if (updated) setSelectedCardForQuestions(updated);
      }
      if (onCardsUpdated) onCardsUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to save question');
      setErrorMessage(err.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (card, qId) => {
    const isConfirmed = await confirm({
      title: 'Delete Mapped Question',
      message: 'Are you sure you want to delete this mapped question from the card?',
      confirmText: 'Delete Question',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await platformAPI.deleteQuestion(card._id || card.id, qId);
      toast.success('Question removed from card.');
      setSuccessMessage('Question removed from card.');
      const res = await platformAPI.getCards(true);
      if (res.success) {
        setCards(res.cards || []);
        const updated = res.cards.find((c) => (c._id || c.id) === (card._id || card.id));
        if (updated) setSelectedCardForQuestions(updated);
      }
      if (onCardsUpdated) onCardsUpdated();
    } catch (err) {
      toast.error(err.message || 'Error deleting question');
      setErrorMessage(err.message || 'Error deleting question');
    }
  };

  return (
    <div className="admin-module-container">
      {/* Header Banner */}
      <div className="admin-view-header">
        <div>
          <span className="admin-tag-label">Admin Management</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 className="admin-title">Cards & Rotation Questions</h2>
            <span className="count-badge-pill">
              {cards.length} Cards ({cards.filter((c) => c.status === 'active').length} Active · {cards.filter((c) => c.status === 'inactive').length} Inactive)
            </span>
          </div>
          <p className="admin-subtitle">
            Configure Mind Lab cards, edit badges, and map custom psycho-educational questions to 0°, 90°, 180°, and 270° orientations.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={openCreateCardModal}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Create New Card
        </button>
      </div>

      {/* Notifications */}
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

      {/* Cards Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Category</th>
                <th>Status</th>
                <th>Rotation Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card._id || card.id}>
                  <td>
                    <div className="table-card-cell">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.name} className="table-card-thumb" />
                      ) : (
                        <div className="table-card-thumb-svg">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <strong>{card.name}</strong>
                        <p className="cell-subtext">{card.description?.slice(0, 45)}...</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-category">{card.category}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-pill ${card.status === 'active' ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(card)}
                      title="Click to toggle active/inactive status"
                    >
                      {card.status === 'active' ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action-ghost"
                      onClick={() => openQuestionsManager(card)}
                      title="View & map questions for each rotation"
                    >
                      <span>🔄 {card.questions?.length || 0} Questions</span>
                      <span className="link-arrow">➔</span>
                    </button>
                  </td>
                  <td>
                    <div className="table-actions-group">
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => openEditCardModal(card)}
                        title="Edit Card Details"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action text-danger"
                        onClick={() => handleDeleteCard(card)}
                        title="Delete Card"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Questions Manager Drawer / Modal for Selected Card */}
      {selectedCardForQuestions && (
        <div className="card-modal-backdrop" onClick={() => setSelectedCardForQuestions(null)}>
          <div className="card-modal-container modal-admin-questions" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedCardForQuestions.imageUrl && (
                  <img
                    src={selectedCardForQuestions.imageUrl}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
                  />
                )}
                <div>
                  <span className="admin-tag-label">Question Mapping</span>
                  <h3 className="modal-title">
                    {selectedCardForQuestions.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setSelectedCardForQuestions(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-questions-list-body">
              <div className="questions-manager-actions">
                <p>
                  Map questions to card angles (<strong>0° Front</strong>, <strong>90° Right</strong>, <strong>180° Back</strong>, <strong>270° Left</strong>).
                </p>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => openAddQuestionModal(selectedCardForQuestions)}
                >
                  + Add Mapped Question
                </button>
              </div>

              <div className="mapped-angles-grid">
                {[0, 90, 180, 270].map((angle) => {
                  const q = selectedCardForQuestions.questions?.find(
                    (item) => Number(item.rotation) === angle
                  );
                  const angleLabel = ROTATION_OPTIONS.find((r) => r.value === angle)?.label;
                  return (
                    <div key={angle} className="mapped-angle-card">
                      <div className="mapped-angle-header">
                        <span className="angle-badge">{angleLabel}</span>
                        {q && (
                          <div className="angle-action-btns">
                            <button
                              type="button"
                              className="btn-icon-mini"
                              onClick={() => openEditQuestionModal(selectedCardForQuestions, q)}
                              title="Edit question"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-icon-mini text-danger"
                              onClick={() => handleDeleteQuestion(selectedCardForQuestions, q._id)}
                              title="Delete question"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {q ? (
                        <div className="mapped-angle-content">
                          <p className="mapped-prompt-text">{q.prompt}</p>
                          <div className="mapped-meta-footer">
                            <span className="badge-qtype">{q.questionType}</span>
                            {q.options?.length > 0 && (
                              <span className="badge-qoptions">{q.options.length} options</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mapped-empty-slot">
                          <p>No question mapped to {angle}°</p>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedCardForQuestions(selectedCardForQuestions);
                              setEditingQuestion(null);
                              setQuestionFormData({
                                rotation: angle,
                                prompt: '',
                                questionType: 'multiple_choice',
                                optionsText: '',
                              });
                              setIsQuestionModalOpen(true);
                            }}
                          >
                            + Map Question
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Create / Edit Modal with Live Card Preview */}
      {isCardModalOpen && (
        <div className="card-modal-backdrop" onClick={() => setIsCardModalOpen(false)}>
          <div className="card-modal-container modal-admin-card-edit" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <h3 className="modal-title">
                {editingCard ? `Edit Card: ${editingCard.name}` : 'Create New Mind Lab Card'}
              </h3>
              <button type="button" className="modal-close-icon-btn" onClick={() => setIsCardModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="admin-form-body admin-form-stacked">
              {/* Card Name */}
              <div className="form-field">
                <label>Card Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cognitive Reframing"
                />
              </div>

              {/* Category */}
              <div className="form-field">
                <label>Category *</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Resilience, Sleep, Focus"
                />
              </div>

              {/* Add Image - Upload Only (No text input) */}
              <div className="form-field">
                <label>Card Image</label>
                <div className="image-upload-container">
                  {formData.imageUrl ? (
                    <div className="uploaded-image-preview-bar">
                      <img src={formData.imageUrl} alt="Uploaded card art" className="uploaded-thumb-mini" />
                      <div className="uploaded-info">
                        <span className="uploaded-text-status">✓ Image attached</span>
                        <div className="uploaded-btn-group">
                          <label className="btn-upload-file">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleFileUpload}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn-upload-remove"
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="btn-upload-file-box">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="upload-box-text">Upload Image</span>
                      <span className="upload-box-sub">Click to select an image from your device</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of this psychological exercise..."
                />
              </div>

              {/* Status */}
              <div className="form-field">
                <label>Card Status</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  options={[
                    { value: 'active', label: 'Active (Visible in Carousel)' },
                    { value: 'inactive', label: 'Inactive (Draft)' },
                  ]}
                />
              </div>

              {/* Live Card Preview (Inline) */}
              <div className="modal-card-preview-inline">
                <h4 className="modal-preview-title">Live Card Preview</h4>
                <div
                  className="live-card-preview-box"
                  style={{ background: formData.gradient || DEFAULT_CARD_GRADIENT }}
                >
                  <div className="card-icon-area">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="preview-card-image" />
                    ) : (
                      <div className="preview-no-image-box">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span className="preview-no-image-label">Upload image to preview</span>
                      </div>
                    )}
                  </div>
                  <h3 className="preview-card-name">
                    {formData.name || 'Card Name Preview'}
                  </h3>
                </div>
              </div>

              {/* Action Buttons - Full width, stacked alignment */}
              <div className="modal-form-actions modal-form-actions-full">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCardModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCard ? 'Save Changes' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Create / Edit Modal */}
      {isQuestionModalOpen && (
        <div className="card-modal-backdrop" onClick={() => setIsQuestionModalOpen(false)}>
          <div className="card-modal-container modal-admin-form" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <h3 className="modal-title">
                {editingQuestion ? 'Edit Rotation Question' : 'Map Question to Rotation'}
              </h3>
              <button type="button" className="modal-close-icon-btn" onClick={() => setIsQuestionModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="admin-form-body">
              <div className="form-field">
                <label>Rotation Orientation *</label>
                <CustomSelect
                  value={questionFormData.rotation}
                  onChange={(val) => setQuestionFormData({ ...questionFormData, rotation: Number(val) })}
                  options={ROTATION_OPTIONS}
                />
              </div>

              <div className="form-field">
                <label>Question Prompt *</label>
                <textarea
                  rows={3}
                  required
                  value={questionFormData.prompt}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, prompt: e.target.value })}
                  placeholder="e.g. What emotional trigger tested your patience today?"
                />
              </div>

              <div className="form-field">
                <label>Response Interaction Type</label>
                <CustomSelect
                  value={questionFormData.questionType}
                  onChange={(val) => setQuestionFormData({ ...questionFormData, questionType: val })}
                  options={[
                    { value: 'multiple_choice', label: 'Multiple Choice (4 Options)' },
                    { value: 'scale_1_10', label: 'Rating Scale (1 to 10)' },
                    { value: 'text_journal', label: 'Text Journal Reflection' },
                  ]}
                />
              </div>

              {questionFormData.questionType === 'multiple_choice' && (
                <div className="form-field">
                  <label>Options (one per line)</label>
                  <textarea
                    rows={4}
                    value={questionFormData.optionsText}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, optionsText: e.target.value })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                  />
                </div>
              )}

              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsQuestionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingQuestion ? 'Update Question' : 'Save Mapped Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
