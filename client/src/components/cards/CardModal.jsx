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

  // 4-Stage Question/Response Flow:
  // 1. 'preview'        -> Initial question display only + "Take Response" button (no text input)
  // 2. 'patient_search' -> Patient Search screen (search by name, email, mobile) + select existing or create new
  // 3. 'patient_create' -> Patient Details Form (Name, Email, Mobile, Age) + "Confirm User Details"
  // 4. 'response'       -> Question response card + Text input + Voice microphone input + "Submit Response"
  const [flowStep, setFlowStep] = useState('preview');
  const [confirmedPatient, setConfirmedPatient] = useState(null);

  // Patient search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSelectingPatient, setIsSelectingPatient] = useState(false);

  // Patient details form state
  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
  });
  const [patientErrors, setPatientErrors] = useState({});
  const [isConfirmingPatient, setIsConfirmingPatient] = useState(false);
  const [patientApiError, setPatientApiError] = useState('');

  // Voice speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef(null);

  // Form states: Response answer text and submission
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Response evaluation state
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [evalMode, setEvalMode] = useState(null); // null | 'manual' | 'ai'
  const [evaluationText, setEvaluationText] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);
  const [evalError, setEvalError] = useState('');

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
    setSubmittedResponse(null);
    setEvalMode(null);
    setEvaluationText('');
    setEvalSaved(false);
    setEvalError('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsRecording(false);
    setVoiceStatus('');
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

  // --- Voice Input SpeechRecognition Setup ---
  const handleToggleVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your response.'
      );
      return;
    }

    if (isRecording) {
      handleStopVoice();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let baseText = userAnswer ? userAnswer.trim() + ' ' : '';

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceStatus('Listening... speak clearly into your microphone');
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        if (finalTranscript) {
          baseText += finalTranscript;
        }
        setUserAnswer(baseText + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permissions in your browser.'
          );
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Microphone notice: ${event.error}`);
        }
        setIsRecording(false);
        setVoiceStatus('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setVoiceStatus('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsRecording(false);
      setVoiceStatus('');
      setErrorMessage('Could not activate microphone. Please type your response.');
    }
  };

  const handleStopVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsRecording(false);
    setVoiceStatus('');
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // --- Patient Search Handlers ---
  const handleSearchPatients = async (query = '') => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const res = await platformAPI.searchPatients(trimmed);
      if (res && res.patients) {
        setSearchResults(res.patients);
      } else {
        setSearchResults([]);
      }
      setHasSearched(true);
    } catch (err) {
      console.error('Error searching patients:', err);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setHasSearched(false);
    } else {
      handleSearchPatients(val);
    }
  };

  const handleSelectExistingPatient = async (patient) => {
    try {
      setIsSelectingPatient(true);
      // Associate with doctor in backend
      await platformAPI.selectPatient(patient.id || patient._id).catch(() => null);
      setConfirmedPatient(patient);
      setFlowStep('response');
    } catch (err) {
      console.error('Error selecting patient:', err);
      setConfirmedPatient(patient);
      setFlowStep('response');
    } finally {
      setIsSelectingPatient(false);
    }
  };

  // --- Patient Details Handlers ---
  const handlePatientInputChange = (e) => {
    const { name, value } = e.target;
    setPatientData((prev) => ({ ...prev, [name]: value }));
    if (patientErrors[name]) {
      setPatientErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (patientApiError) {
      setPatientApiError('');
    }
  };

  const handleConfirmPatient = async (e) => {
    e.preventDefault();
    const errors = {};
    const cleanName = patientData.name.trim();
    const cleanEmail = patientData.email.trim();
    const cleanPhone = patientData.phone.trim();
    const cleanAge = patientData.age.toString().trim();

    if (!cleanName) {
      errors.name = 'Name is required';
    }

    if (!cleanEmail) {
      errors.email = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!cleanPhone) {
      errors.phone = 'Phone number is required';
    } else {
      const digits = cleanPhone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errors.phone = 'Please enter a valid phone number (7 to 15 digits)';
      }
    }

    if (!cleanAge) {
      errors.age = 'Age is required';
    } else {
      const numAge = Number(cleanAge);
      if (isNaN(numAge) || numAge < 1 || numAge > 125) {
        errors.age = 'Please enter a valid age between 1 and 125';
      }
    }

    if (Object.keys(errors).length > 0) {
      setPatientErrors(errors);
      return;
    }

    try {
      setIsConfirmingPatient(true);
      setPatientApiError('');

      const res = await platformAPI.createPatient({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        age: Number(cleanAge),
      });

      if (res && res.user) {
        setConfirmedPatient(res.user);
        // Advance to Question Response Card
        setFlowStep('response');
      } else {
        throw new Error('Could not confirm patient details.');
      }
    } catch (err) {
      const msg = err.message || 'Failed to confirm user details.';
      if (err.data?.field) {
        setPatientErrors((prev) => ({ ...prev, [err.data.field]: msg }));
      } else {
        setPatientApiError(msg);
      }
    } finally {
      setIsConfirmingPatient(false);
    }
  };

  // --- Handle Answer Submission ---
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (isRecording) {
      handleStopVoice();
    }

    const finalAnswer = userAnswer.trim();

    if (!finalAnswer) {
      setErrorMessage('Please enter your reflections before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const res = await platformAPI.submitResponse({
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
        userId: confirmedPatient?.id || confirmedPatient?._id || user?._id || null,
        userName: confirmedPatient?.name || user?.name || 'MindLab Member',
        userEmail: confirmedPatient?.email || user?.email || '',
        patientId: confirmedPatient?.id || confirmedPatient?._id || null,
        patientName: confirmedPatient?.name || '',
        patientEmail: confirmedPatient?.email || '',
        doctorId: user?._id || null,
        doctorName: user?.name || '',
      });

      const savedResponse = res?.response || res?.data || {
        id: res?.id || res?._id,
        _id: res?._id || res?.id,
        userName: confirmedPatient?.name || user?.name || 'Patient',
        cardName: card.name,
        questionText: matchedQuestion?.prompt || 'Reflection',
        answer: finalAnswer,
      };

      setSubmittedResponse(savedResponse);
      setSubmitSuccess(true);
      setEvalMode(null);
      setEvaluationText('');
      setEvalSaved(false);
      setEvalError('');
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Manual Evaluation Submission ---
  const handleSubmitEvaluation = async (e) => {
    if (e) e.preventDefault();
    const cleanEval = evaluationText.trim();
    if (!cleanEval) {
      setEvalError('Please enter your evaluation before submitting.');
      return;
    }

    const respId = submittedResponse?.id || submittedResponse?._id;
    if (!respId) {
      setEvalError('Unable to identify response ID to save evaluation.');
      return;
    }

    try {
      setIsSubmittingEval(true);
      setEvalError('');

      const res = await platformAPI.evaluateResponse(respId, {
        evaluation: cleanEval,
        evaluationType: 'manual',
        doctorId: user?._id || null,
        doctorName: user?.name || '',
      });

      if (res?.response) {
        setSubmittedResponse(res.response);
      }
      setEvalSaved(true);
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }
    } catch (err) {
      setEvalError(err.message || 'Failed to save evaluation. Please try again.');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  if (!card) return null;

  return (
    <div
      className="card-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-card-title"
    >
      <div className="card-modal-container">
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
              {/* STAGE 1: QUESTION DISPLAY (Initial screen - Question only + Take Response button) */}
              {flowStep === 'preview' && (
                <div className="question-preview-container">
                  <h3 className="unlocked-question-prompt">
                    {matchedQuestion.prompt}
                  </h3>

                  <div className="take-response-action-wrap">
                    <button
                      type="button"
                      id="take-response-btn"
                      className="take-response-btn"
                      onClick={() => {
                        setFlowStep('patient_search');
                        setSearchQuery('');
                        setPatientApiError('');
                      }}
                    >
                      <span>Take Response</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: PATIENT SEARCH SCREEN */}
              {flowStep === 'patient_search' && (
                <div className="patient-search-wrapper">
                  <div className="patient-form-header">
                    <div className="patient-form-nav">
                      <button
                        type="button"
                        className="patient-form-back-btn"
                        onClick={() => setFlowStep('preview')}
                        title="Back to question"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Question
                      </button>
                      <span className="patient-form-badge">Patient Search</span>
                    </div>
                    <h4 className="patient-form-title">Select Patient</h4>
                    <p className="patient-form-desc">
                      Search an existing patient or create a new record to take response.
                    </p>
                  </div>

                  {/* Search Input Box */}
                  <div className="patient-search-input-box">
                    <span className="patient-search-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="patient-search-input"
                      className="patient-search-input"
                      placeholder="Search patient by name, email or mobile number"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      autoFocus
                    />
                  </div>

                  <div className="patient-search-top-bar">
                    <span className="patient-search-count">
                      {isSearching
                        ? 'Searching...'
                        : !searchQuery.trim()
                        ? 'Directory Search'
                        : searchResults.length > 0
                        ? `${searchResults.length} matching patient${searchResults.length === 1 ? '' : 's'}`
                        : '0 patients found'}
                    </span>
                    <button
                      type="button"
                      className="patient-quick-create-btn"
                      onClick={() => {
                        setFlowStep('patient_create');
                        setPatientErrors({});
                        setPatientApiError('');
                      }}
                    >
                      <span>+ Create New Patient</span>
                    </button>
                  </div>

                  {/* Results List or Empty Prompt */}
                  {!searchQuery.trim() ? (
                    <div className="patient-search-initial-prompt">
                      <div className="patient-search-prompt-icon">🔍</div>
                      <p className="patient-search-prompt-text">
                        Type a patient's name, email, or mobile number to search.
                      </p>
                      <button
                        type="button"
                        className="patient-quick-create-btn"
                        style={{ marginTop: '6px', color: 'var(--color-accent)' }}
                        onClick={() => {
                          setFlowStep('patient_create');
                          setPatientErrors({});
                          setPatientApiError('');
                        }}
                      >
                        <span>+ Or click here to create a new patient</span>
                      </button>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="patient-search-results-list">
                      {searchResults.map((p) => (
                        <button
                          key={p.id || p._id}
                          type="button"
                          className="patient-search-card"
                          disabled={isSelectingPatient}
                          onClick={() => handleSelectExistingPatient(p)}
                        >
                          <span className="patient-card-name">{p.name}</span>
                          <span className="patient-card-contact">
                            {p.email} | {p.phone || 'No mobile'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : hasSearched && !isSearching ? (
                    <div className="patient-no-results-box">
                      <h5 className="patient-no-results-title">No patients found</h5>
                      <p className="patient-no-results-desc">
                        No existing patient matching "{searchQuery}" was found.
                      </p>
                      <button
                        type="button"
                        id="create-new-patient-btn"
                        className="patient-create-new-btn"
                        onClick={() => {
                          setFlowStep('patient_create');
                          setPatientErrors({});
                          setPatientApiError('');
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>Create New Patient</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* STAGE 3: CREATE NEW PATIENT FORM */}
              {flowStep === 'patient_create' && (
                <div className="patient-form-container">
                  <div className="patient-form-header">
                    <div className="patient-form-nav">
                      <button
                        type="button"
                        className="patient-form-back-btn"
                        onClick={() => setFlowStep('patient_search')}
                        title="Back to search"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Search
                      </button>
                      <span className="patient-form-badge">New Patient</span>
                    </div>
                    <h4 className="patient-form-title">Create Patient</h4>
                    <p className="patient-form-desc">
                      Enter details to create or link this patient account.
                    </p>
                  </div>

                  {patientApiError && (
                    <div className="patient-alert-error" role="alert">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{patientApiError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmPatient} className="patient-form-container" noValidate>
                    <div className="patient-field-group">
                      <label htmlFor="patient-name-field" className="patient-input-label">
                        Name <span className="patient-required-star">*</span>
                      </label>
                      <input
                        id="patient-name-field"
                        type="text"
                        name="name"
                        value={patientData.name}
                        onChange={handlePatientInputChange}
                        placeholder="Enter patient's full name"
                        className={`patient-text-input ${patientErrors.name ? 'input-has-error' : ''}`}
                        required
                        autoFocus
                      />
                      {patientErrors.name && (
                        <span className="patient-field-error">{patientErrors.name}</span>
                      )}
                    </div>

                    <div className="patient-field-group">
                      <label htmlFor="patient-email-field" className="patient-input-label">
                        Email ID <span className="patient-required-star">*</span>
                      </label>
                      <input
                        id="patient-email-field"
                        type="email"
                        name="email"
                        value={patientData.email}
                        onChange={handlePatientInputChange}
                        placeholder="patient@example.com"
                        className={`patient-text-input ${patientErrors.email ? 'input-has-error' : ''}`}
                        required
                      />
                      {patientErrors.email && (
                        <span className="patient-field-error">{patientErrors.email}</span>
                      )}
                    </div>

                    <div className="patient-field-group">
                      <label htmlFor="patient-phone-field" className="patient-input-label">
                        Mobile / Phone Number <span className="patient-required-star">*</span>
                      </label>
                      <input
                        id="patient-phone-field"
                        type="tel"
                        name="phone"
                        value={patientData.phone}
                        onChange={handlePatientInputChange}
                        placeholder="e.g. 9876543210"
                        className={`patient-text-input ${patientErrors.phone ? 'input-has-error' : ''}`}
                        required
                      />
                      {patientErrors.phone && (
                        <span className="patient-field-error">{patientErrors.phone}</span>
                      )}
                    </div>

                    <div className="patient-field-group">
                      <label htmlFor="patient-age-field" className="patient-input-label">
                        Age <span className="patient-required-star">*</span>
                      </label>
                      <input
                        id="patient-age-field"
                        type="number"
                        name="age"
                        min="1"
                        max="125"
                        value={patientData.age}
                        onChange={handlePatientInputChange}
                        placeholder="e.g. 28"
                        className={`patient-text-input ${patientErrors.age ? 'input-has-error' : ''}`}
                        required
                      />
                      {patientErrors.age && (
                        <span className="patient-field-error">{patientErrors.age}</span>
                      )}
                    </div>

                    <div className="form-submit-row" style={{ marginTop: '8px' }}>
                      <button
                        type="submit"
                        id="confirm-patient-details-btn"
                        className="btn-primary"
                        disabled={isConfirmingPatient}
                        style={{ width: '100%' }}
                      >
                        {isConfirmingPatient ? 'Confirming User Details...' : 'Confirm User Details'}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STAGE 4: TAKE THE PATIENT RESPONSE & EVALUATION */}
              {flowStep === 'response' && (
                submitSuccess ? (
                  <div className="eval-response-card" id="response-evaluation-card">
                    {/* Header: Username | Card Name */}
                    <div className="eval-card-header">
                      <h4 className="eval-header-title">
                        <span className="eval-username">
                          {confirmedPatient?.name || submittedResponse?.userName || 'Patient'}
                        </span>
                        <span className="eval-header-pipe">|</span>
                        <span className="eval-cardname">
                          {card?.name || submittedResponse?.cardName}
                        </span>
                      </h4>
                    </div>

                    {/* Question Block */}
                    <div className="eval-card-block">
                      <div className="eval-block-label">Question</div>
                      <div className="eval-question-content">
                        {submittedResponse?.questionText || matchedQuestion?.prompt}
                      </div>
                    </div>

                    {/* User Response Block */}
                    <div className="eval-card-block">
                      <div className="eval-block-label">User Response</div>
                      <div className="eval-response-content">
                        {submittedResponse?.answer || userAnswer}
                      </div>
                    </div>

                    {/* Mode Action Buttons: [ Manual ] [ AI ] */}
                    <div className="eval-mode-toggle-group">
                      <button
                        type="button"
                        id="eval-mode-manual-btn"
                        className={`eval-toggle-btn ${evalMode === 'manual' ? 'is-selected' : ''}`}
                        onClick={() => {
                          setEvalMode('manual');
                          setEvalError('');
                        }}
                      >
                        Manual
                      </button>
                      <button
                        type="button"
                        id="eval-mode-ai-btn"
                        className={`eval-toggle-btn ${evalMode === 'ai' ? 'is-selected' : ''}`}
                        onClick={() => {
                          setEvalMode('ai');
                          setEvalError('');
                        }}
                      >
                        AI
                      </button>
                    </div>

                    {/* AI Placeholder State (No input, no API call, placeholder only) */}
                    {evalMode === 'ai' && (
                      <div className="eval-ai-placeholder-msg">
                        <span className="ai-sparkle-dot">✨</span>
                        <span>AI evaluation is a placeholder for future automated assessment.</span>
                      </div>
                    )}

                    {/* When Doctor selects Manual */}
                    {evalMode === 'manual' && (
                      <div className="eval-manual-section">
                        <div className="eval-manual-title-row">
                          <span className="eval-manual-heading">Manual Evaluation</span>
                          {evalSaved && (
                            <span className="eval-saved-tag">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Evaluation Saved
                            </span>
                          )}
                        </div>

                        <div className="eval-textarea-container">
                          <textarea
                            id="eval-manual-textarea"
                            rows={4}
                            placeholder="Enter your evaluation here..."
                            value={evaluationText}
                            onChange={(e) => setEvaluationText(e.target.value)}
                            className="eval-manual-textarea"
                            autoFocus
                          />
                        </div>

                        {evalError && <p className="eval-error-message">{evalError}</p>}

                        <div className="eval-submit-container">
                          <button
                            type="button"
                            id="submit-evaluation-btn"
                            className="btn-primary eval-submit-button"
                            disabled={isSubmittingEval}
                            onClick={handleSubmitEvaluation}
                          >
                            {isSubmittingEval
                              ? 'Saving Evaluation...'
                              : evalSaved
                              ? 'Update Evaluation'
                              : 'Submit Evaluation'}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subtly allow exploring next reflection if needed */}
                    <div className="eval-card-footer-nav">
                      <button
                        type="button"
                        className="eval-next-step-btn"
                        onClick={rotateNext}
                      >
                        Explore Next Reflection ➔
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="question-response-active-card">
                    {confirmedPatient && (
                      <div className="patient-answering-pill">
                        <div className="patient-pill-left">
                          <div className="patient-avatar-mini">
                            {confirmedPatient.name ? confirmedPatient.name[0].toUpperCase() : 'P'}
                          </div>
                          <span className="patient-pill-text">
                            Patient: <strong>{confirmedPatient.name}</strong> (Age {confirmedPatient.age})
                          </span>
                        </div>
                        <button
                          type="button"
                          className="patient-pill-change-btn"
                          onClick={() => setFlowStep('patient_search')}
                          title="Edit or switch patient details"
                        >
                          Change
                        </button>
                      </div>
                    )}

                    <h3 className="unlocked-question-prompt">
                      {matchedQuestion.prompt}
                    </h3>

                    <form onSubmit={handleSubmitAnswer} className="question-answer-form">
                      {/* Voice Input & Text Control Row */}
                      <div className="voice-input-header-row">
                        <label className="voice-input-label" htmlFor="patient-answer-textarea">
                          Your Reflection:
                        </label>
                        <button
                          type="button"
                          id="voice-mic-toggle-btn"
                          className={`voice-mic-btn ${isRecording ? 'is-recording' : ''}`}
                          onClick={handleToggleVoice}
                          title={isRecording ? 'Click to stop voice recording' : 'Click to answer by voice'}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                          <span>{isRecording ? 'Stop Voice' : 'Voice Input'}</span>
                        </button>
                      </div>

                      {/* Live Voice Recording Status Banner */}
                      {isRecording && (
                        <div className="voice-recording-status">
                          <div className="voice-status-left">
                            <span className="voice-pulse-dot" />
                            <span>{voiceStatus || 'Listening... speak clearly'}</span>
                          </div>
                          <button
                            type="button"
                            className="voice-stop-pill"
                            onClick={handleStopVoice}
                          >
                            Stop
                          </button>
                        </div>
                      )}

                      {/* Clean Text Entry (Text or Voice dictation) */}
                      <div className="journal-textarea-wrap">
                        <textarea
                          id="patient-answer-textarea"
                          rows={4}
                          placeholder="Write your honest reflections here or click 'Voice Input' to speak..."
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
                          id="submit-patient-response-btn"
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
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
