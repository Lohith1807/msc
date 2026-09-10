import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function CardCarousel({ cards, onSelectCard }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef(null);

  // Clamp active index whenever cards length changes
  useEffect(() => {
    if (cards.length > 0 && activeIndex >= cards.length) {
      setActiveIndex(0);
    }
  }, [cards.length, activeIndex]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (cards[activeIndex]) {
          onSelectCard(cards[activeIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, cards, onSelectCard]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  }, [cards.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  }, [cards.length]);

  const goToStep = useCallback((step) => {
    setActiveIndex((prev) => (prev + step + cards.length) % cards.length);
  }, [cards.length]);

  // Touch Handlers
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (Math.abs(diff) > 7) setHasMoved(true);
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 45;
    if (dragOffset > threshold) {
      goToPrev();
    } else if (dragOffset < -threshold) {
      goToNext();
    }
    setDragOffset(0);
    setTimeout(() => setHasMoved(false), 60);
  };

  // Mouse Drag Handlers (Desktop)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.clientX);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 7) setHasMoved(true);
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 55;
    if (dragOffset > threshold) {
      goToPrev();
    } else if (dragOffset < -threshold) {
      goToNext();
    }
    setDragOffset(0);
    setTimeout(() => setHasMoved(false), 60);
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="carousel-empty-state">
        <div className="empty-icon">🎴</div>
        <h3>No cards available</h3>
        <p>Cards created by the administrator will appear in this interactive deck.</p>
      </div>
    );
  }

  // Calculate card slot relative to activeIndex
  // Requirements: anytime 2 cards at right, 1 on left, 1 main card in center on overlap
  const getSlot = (idx) => {
    const total = cards.length;
    if (total === 0) return 'hidden';
    if (idx === activeIndex) return 'main';
    const leftIdx = (activeIndex - 1 + total) % total;
    const right1Idx = (activeIndex + 1) % total;
    const right2Idx = (activeIndex + 2) % total;

    if (idx === leftIdx) return 'left';
    if (idx === right1Idx) return 'right-1';
    if (total >= 4 && idx === right2Idx) return 'right-2';
    return 'hidden';
  };

  const handleCardClick = (card, slot, idx) => {
    if (hasMoved) return;
    if (slot === 'main') {
      onSelectCard(card);
    } else if (slot === 'left') {
      goToPrev();
    } else if (slot === 'right-1') {
      goToNext();
    } else if (slot === 'right-2') {
      goToStep(2);
    } else {
      setActiveIndex(idx);
    }
  };

  return (
    <section className="card-carousel-section" aria-label="Interactive Card Carousel">
      <div className="carousel-header">
        <div className="carousel-titles">
          <span className="section-eyebrow">Interactive Card Deck</span>
          <h2 className="section-title">Explore Daily Mind Lab Cards</h2>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={goToPrev}
            aria-label="Previous card (Arrow Left)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <span className="carousel-counter">
            <strong>{activeIndex + 1}</strong> / {cards.length}
          </span>

          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={goToNext}
            aria-label="Next card (Arrow Right)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Overlapping Deck Stage Container */}
      <div
        className="carousel-stage-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="carousel-deck-stage"
          style={{
            transform: isDragging ? `translateX(${dragOffset * 0.22}px)` : 'none',
            transition: isDragging ? 'none' : 'transform 260ms ease-out',
          }}
        >
          {cards.map((card, idx) => {
            const slot = getSlot(idx);
            const isMain = slot === 'main';

            return (
              <div
                key={card._id || card.id || idx}
                className={`carousel-card-item card-slot-${slot}`}
                onClick={() => handleCardClick(card, slot, idx)}
                role="button"
                tabIndex={0}
                aria-selected={isMain}
                aria-label={`Card: ${card.name}, ${card.levelBadge || ''}`}
              >
                <div
                  className={`carousel-card-inner ${card.imageUrl ? 'has-custom-image' : ''}`}
                  style={{
                    background: card.gradient || 'linear-gradient(145deg, #132b3c 0%, #174256 50%, #1f687a 100%)',
                  }}
                >
                  {/* Card Graphic/Image Area */}
                  <div className="card-icon-area">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="card-custom-image carousel-card-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="card-image-fallback-svg">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card Title Only */}
                  <div className="card-bottom-info">
                    <h3 className="card-title" title={card.name}>
                      {card.name}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="carousel-dots-bar">
        {cards.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`carousel-dot ${idx === activeIndex ? 'is-active' : ''}`}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Usage Guide Notice */}
      <p className="carousel-tip-notice">
        💡 <strong>Tip:</strong> Swipe horizontally or click adjacent cards to cycle. Click the center card to open the 3D rotation solver.
      </p>
    </section>
  );
}
