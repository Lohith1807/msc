import React, { useState, useEffect, useRef } from 'react';
import { platformAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STEP_ROTATIONS = [0, 90, 180, 270];

export default function CardModal({ card, onClose, onResponseSubmitted }) {
  const { user } = useAuth();

  // Rotation state: cumulative degrees in multiples of 90 (0, 90, 180, 270, 360, ...)
  const [totalAngle, setTotalAngle] = useState(0);

  // Drag and swipe gesture tracking (hand gestures)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);
  const didDrag = useRef(false);
  const modalCardRef = useRef(null);

  // Form states: ALL questions use text input only
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Swipe-down on container to close on mobile
  const [touchStartY, setTouchStartY] = useState(0);

  // Derived current step (0, 1, 2, 3) and orientation mode
  const stepIndex = Math.abs(Math.floor(totalAngle / 90) % 4 + 4) % 4;
  const isLandscape = stepIndex === 1 || stepIndex === 3;
  const currentDbRotation = STEP_ROTATIONS[stepIndex];
  const imageAngle = stepIndex * 90;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'r' || e.key === 'R' || e.key === ' ') {
        rotateNext();
      } else if (e.key === 'ArrowLeft') {
        rotatePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find question corresponding to current reflection step
  const matchedQuestion =
    card?.questions?.find((q) => Number(q.rotation) === currentDbRotation) ||
    card?.questions?.[stepIndex] || {
      prompt: 'Reflect on this card’s theme and its presence in your daily habits.',
      questionType: 'text_journal',
      options: [],
    };

  // Reset answer when step changes
  useEffect(() => {
    setUserAnswer('');
    setSubmitSuccess(false);
    setErrorMessage('');
  }, [stepIndex]);

  // Rotate next (clockwise -> changes portrait to landscape to portrait...)
  const rotateNext = () => {
    setTotalAngle((prev) => prev + 90);
  };

  // Rotate prev (counter-clockwise)
  const rotatePrev = () => {
    setTotalAngle((prev) => prev - 90);
  };

  // Jump directly to specific step (0, 1, 2, 3)
  const goToStep = (targetStep) => {
    const currentStep = Math.abs(Math.floor(totalAngle / 90) % 4 + 4) % 4;
    let diff = targetStep - currentStep;
    if (diff === 3) diff = -1;
    if (diff === -3) diff = 1;
    setTotalAngle((prev) => prev + diff * 90);
  };

  // Swipe-down to close on modal backdrop/header
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    const diffY = e.changedTouches[0].clientY - touchStartY;
    if (diffY > 120) {
      onClose();
    }
  };

  // Touch Drag Gestures on the Card (rotate with hand)
  const handleCardTouchStart = (e) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartTime.current = Date.now();
    didDrag.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleCardTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - dragStartX.current;
    if (Math.abs(diff) > 6) {
      didDrag.current = true;
    }
    setDragOffset(diff);
  };

  const handleCardTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = dragOffset;
    const elapsed = Date.now() - dragStartTime.current;
    const isQuickFlick = elapsed < 320 && Math.abs(diff) > 20;
    const isLargeDrag = Math.abs(diff) > 35;

    if (isQuickFlick || isLargeDrag) {
      if (diff > 0) {
        // Dragged right -> rotate next (portrait -> landscape)
        rotateNext();
      } else {
        // Dragged left -> rotate prev
        rotatePrev();
      }
    } else if (!didDrag.current) {
      // Tap on card with hand rotates to next
      rotateNext();
    }
    setDragOffset(0);
  };

  // Mouse Drag Gestures on the Card (for laptops/desktops)
  const handleCardMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartTime.current = Date.now();
    didDrag.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleCardMouseMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) > 6) {
      didDrag.current = true;
    }
    setDragOffset(diff);
  };

  const handleCardMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = dragOffset;
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        rotateNext();
      } else {
        rotatePrev();
      }
    } else if (!didDrag.current) {
      rotateNext();
    }
    setDragOffset(0);
  };

  // Handle Answer Submission (text only for all questions)
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    const finalAnswer = userAnswer.trim();

    if (!finalAnswer) {
      setErrorMessage('Please enter your reflections before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await platformAPI.submitResponse({
        cardId: card._id || card.id,
        cardName: card.name,
        rotationAngle: currentDbRotation,
        rotation: currentDbRotation,
        rotationLabel: matchedQuestion?.rotationLabel || `${currentDbRotation}°`,
        questionId: matchedQuestion?._id || matchedQuestion?.id,
        questionText: matchedQuestion?.prompt || 'Reflection',
        questionPrompt: matchedQuestion?.prompt || 'Reflection',
        questionType: 'text_journal',
        answer: finalAnswer,
        userName: user?.name || 'MindLab Member',
        userEmail: user?.email || '',
      });

      setSubmitSuccess(true);
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!card) return null;

  return (
    <div
      className="card-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-card-title"
    >
      <div
        className="card-modal-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Drag Down Bar */}
        <div className="mobile-swipe-handle" onClick={onClose} title="Swipe or tap down to close" />

        {/* Modal Top Bar */}
        <div className="card-modal-header">
          <div className="modal-header-title-wrap">
            <span className="modal-header-eyebrow">Card Reflection</span>
            <h3 className="modal-header-card-name">{card.name}</h3>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close card modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Main 2-Column or Stacked Inspection Area */}
        <div className="card-modal-content-grid">
          {/* Left: Gallery Rotating Card Showcase */}
          <div className="card-3d-showcase-column">
            <div className="card-gallery-wrapper">
              {/* Previous Rotate Chevron - visible only on laptops/desktops */}
              <button
                type="button"
                className="gallery-nav-arrow arrow-prev"
                onClick={rotatePrev}
                aria-label="Rotate previous reflection"
                title="Rotate counter-clockwise"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Interactive Rotating Card */}
              <div className="card-gallery-stage">
                <div
                  ref={modalCardRef}
                  className={`gallery-card-frame ${isLandscape ? 'orientation-landscape' : 'orientation-portrait'} ${isDragging ? 'is-dragging' : ''}`}
                  style={{
                    background: card.gradient || 'linear-gradient(135deg, #1c3a52 0%, #2a9fb0 100%)',
                    transform: `rotate(${isDragging ? dragOffset * 0.28 : 0}deg) scale(${isDragging ? 0.96 : 1})`,
                  }}
                  onTouchStart={handleCardTouchStart}
                  onTouchMove={handleCardTouchMove}
                  onTouchEnd={handleCardTouchEnd}
                  onMouseDown={handleCardMouseDown}
                  onMouseMove={handleCardMouseMove}
                  onMouseUp={handleCardMouseUp}
                  onMouseLeave={handleCardMouseUp}
                  title="Swipe, drag, or tap card to rotate between Portrait and Landscape"
                >
                  <div className={`gallery-card-inner ${isLandscape ? 'inner-landscape' : 'inner-portrait'}`}>
                    <div className="gallery-card-symbol">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="gallery-custom-image"
                          style={{
                            transform: `rotate(${imageAngle + (isDragging ? dragOffset * 0.35 : 0)}deg)`,
                            transition: isDragging ? 'none' : 'transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                        />
                      ) : (
                        <div
                          className="gallery-image-fallback-svg"
                          style={{
                            transform: `rotate(${imageAngle + (isDragging ? dragOffset * 0.35 : 0)}deg)`,
                            transition: isDragging ? 'none' : 'transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            display: 'inline-block',
                          }}
                        >
                          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="gallery-card-info">
                      <h2 id="modal-card-title" className="gallery-card-title">
                        {card.name}
                      </h2>
                      <span className="gallery-reflection-tag">
                        Reflection {stepIndex + 1} of 4 · {isLandscape ? 'Landscape' : 'Portrait'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Rotate Chevron - visible only on laptops/desktops */}
              <button
                type="button"
                className="gallery-nav-arrow arrow-next"
                onClick={rotateNext}
                aria-label="Rotate next reflection"
                title="Rotate clockwise"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Gallery Step Dots & Gesture Caption */}
            <div className="gallery-dots-bar">
              <div className="gallery-step-dots">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`step-dot ${idx === stepIndex ? 'active' : ''}`}
                    onClick={() => goToStep(idx)}
                    aria-label={`Switch to Reflection ${idx + 1}`}
                    title={`Reflection ${idx + 1}`}
                  />
                ))}
              </div>
              <p className="gallery-gesture-caption">
                <span>↔</span> Swipe or tap card with hand to rotate
              </p>
            </div>
          </div>

          {/* Right: Dynamic Question Form (Text-only for all questions) */}
          <div className="question-unlocked-column">
            <div className="question-state-badge">
              <span className="radar-ping" />
              <span>
                Reflection {stepIndex + 1} of 4 · <strong>{isLandscape ? 'Landscape View' : 'Portrait View'}</strong>
              </span>
            </div>

            <div className="question-card-box">
              <h3 className="unlocked-question-prompt">
                {matchedQuestion.prompt}
              </h3>

              {/* Interactive Text Answer Form */}
              {submitSuccess ? (
                <div className="response-success-alert">
                  <div className="success-icon">✨</div>
                  <h4>Reflection Recorded!</h4>
                  <p>Your response has been saved and your reflection count updated.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={rotateNext}
                    style={{ marginTop: '12px' }}
                  >
                    Explore Next Reflection ➔
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitAnswer} className="question-answer-form">
                  {/* Clean Text Entry for all questions */}
                  <div className="journal-textarea-wrap">
                    <textarea
                      rows={4}
                      placeholder="Write your honest reflections here..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="journal-textarea"
                      required
                    />
                  </div>

                  {errorMessage && <p className="error-text-msg">{errorMessage}</p>}

                  <div className="form-submit-row">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting}
                      style={{ width: '100%' }}
                    >
                      {isSubmitting ? 'Saving Reflection...' : 'Submit Response'}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
