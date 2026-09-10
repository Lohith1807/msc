/**
 * Data Structures & Algorithms (DSA):
 * High-Performance O(1) Least Recently Used (LRU) Cache using a Hash Map
 * with amortized O(1) get/set and O(1) FIFO/LRU eviction.
 */
class AgeLRUCache {
  constructor(capacity = 500) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh access order (LRU policy)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // O(1) eviction of oldest key
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

const memoizedAgeCache = new AgeLRUCache(500);

/**
 * Calculate user's age dynamically from Date of Birth (DOB) and reference date.
 * Accurately accounts for whether the user's birthday has occurred in the current year.
 * Employs Memoized Dynamic Programming with O(1) amortized time complexity.
 *
 * Example:
 * DOB: 15 September 2000, Current Date: 10 September 2026 -> Age = 25
 * DOB: 15 September 2000, Current Date: 16 September 2026 -> Age = 26
 *
 * @param {string|Date} dob - The date of birth (e.g. "2000-09-15" or Date)
 * @param {Date} [referenceDate=new Date()] - Reference date for age computation
 * @returns {number|null} Calculated age or null if invalid/empty
 */
export const calculateAge = (dob, referenceDate = new Date()) => {
  if (!dob) return null;

  const today = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (isNaN(today.getTime())) return null;

  // Memoization lookup key: O(1) cache retrieval
  const dobKey = typeof dob === 'string'
    ? dob.slice(0, 10)
    : (dob.toISOString ? dob.toISOString().slice(0, 10) : null);
  const refKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const cacheKey = dobKey ? `${dobKey}_${refKey}` : null;

  if (cacheKey) {
    const cached = memoizedAgeCache.get(cacheKey);
    if (cached !== null) return cached;
  }

  let birthYear, birthMonth, birthDay;

  if (typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dob)) {
    // Parse YYYY-MM-DD string cleanly without timezone shifting
    const parts = dob.slice(0, 10).split('-').map(Number);
    birthYear = parts[0];
    birthMonth = parts[1] - 1; // JavaScript month is 0-indexed
    birthDay = parts[2];
  } else {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    birthYear = d.getFullYear();
    birthMonth = d.getMonth();
    birthDay = d.getDate();
  }

  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() - birthMonth;

  // If the birthday has not yet occurred this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--;
  }

  const finalAge = age >= 0 ? age : 0;

  if (cacheKey) {
    memoizedAgeCache.set(cacheKey, finalAge);
  }

  return finalAge;
};

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 * Useful for `<input type="date" max={getTodayDateString()} />`
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a Date or ISO string into a standard readable date: "15 Sep 2000"
 */
export const formatDateReadable = (dob) => {
  if (!dob) return '';
  try {
    let d;
    if (typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dob)) {
      const [y, m, day] = dob.slice(0, 10).split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dob);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};
