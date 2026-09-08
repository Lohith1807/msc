import React, { useState, useRef, useEffect } from 'react';

/**
 * Reusable CustomSelect component that stays 100% inside its container.
 * Prevents OS dropdown popups from overflowing out of modals or cards.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [], // [{ value, label }] or ['opt1', 'opt2']
  placeholder = 'Select an option...',
  className = '',
  disabled = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${isOpen ? 'is-open' : ''} ${className}`}
    >
      <button
        type="button"
        id={id}
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`custom-select-chevron ${isOpen ? 'is-rotated' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul className="custom-select-menu" role="listbox">
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                className={`custom-select-item ${isSelected ? 'is-selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
              >
                <span className="custom-select-item-text">{opt.label}</span>
                {isSelected && <span className="custom-select-check">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
