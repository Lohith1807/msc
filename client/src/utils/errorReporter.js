/**
 * Frontend Error Reporter
 *
 * Captures global JavaScript runtime errors and unhandled promise rejections,
 * then sends them to the backend Dev Logs system.
 *
 * DSA: Token bucket rate limiter (O(1) per check) to prevent flooding:
 *   - Max 5 error reports per 30 seconds
 *   - Deduplication via Set of recent error fingerprints (O(1) lookup)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const MAX_ERRORS_PER_WINDOW = 5;
const WINDOW_MS = 30_000; // 30 seconds
const DEDUPE_WINDOW_MS = 60_000; // 1 minute for same-error dedup

// Token bucket state
let errorCount = 0;
let windowStart = Date.now();

// Recent error fingerprints for client-side dedup (O(1) Set lookup)
const recentFingerprints = new Set();

function getFingerprint(message, source) {
  return `${message?.substring(0, 80)}|${source?.substring(0, 80)}`;
}

function isRateLimited() {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    // Reset window
    errorCount = 0;
    windowStart = now;
  }
  if (errorCount >= MAX_ERRORS_PER_WINDOW) return true;
  errorCount++;
  return false;
}

function isDuplicate(fingerprint) {
  if (recentFingerprints.has(fingerprint)) return true;
  recentFingerprints.add(fingerprint);
  // Auto-remove after dedupe window
  setTimeout(() => recentFingerprints.delete(fingerprint), DEDUPE_WINDOW_MS);
  return false;
}

async function reportError({ message, source, lineno, colno, stack, type }) {
  // Skip non-meaningful errors
  if (!message || message === 'Script error.' || message.includes('ResizeObserver')) return;
  // Skip errors from browser extensions
  if (source && (source.includes('chrome-extension://') || source.includes('moz-extension://'))) return;

  const fingerprint = getFingerprint(message, source);
  if (isDuplicate(fingerprint)) return;
  if (isRateLimited()) return;

  try {
    await fetch(`${API_BASE_URL}/dev/logs/frontend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(message).substring(0, 500),
        source: source?.substring(0, 200),
        lineno,
        colno,
        stack: stack?.substring(0, 3000),
        type,
      }),
    });
  } catch {
    // Never throw from error reporter
  }
}

/**
 * Install global error handlers.
 * Call this once at application startup (e.g., in main.jsx).
 */
export function installErrorReporter() {
  // Global JavaScript runtime errors
  window.addEventListener('error', (event) => {
    reportError({
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      type: 'runtime_error',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : (typeof reason === 'string' ? reason : JSON.stringify(reason));

    reportError({
      message: `Unhandled Promise Rejection: ${message}`.substring(0, 500),
      source: 'promise',
      lineno: null,
      colno: null,
      stack: reason instanceof Error ? reason.stack : null,
      type: 'unhandled_rejection',
    });
  });
}

export default installErrorReporter;
