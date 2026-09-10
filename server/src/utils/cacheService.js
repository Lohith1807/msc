/**
 * High-Performance In-Memory Cache Service
 * Utilizes a Hash Map (JavaScript Map) for O(1) amortized get, set, and delete operations.
 * Supports Time-To-Live (TTL) expiration and prefix-based cache invalidation.
 */
class MemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;

    // Periodic sweep every 60 seconds to prune expired keys and free memory
    this.cleanupInterval = setInterval(() => {
      this.pruneExpired();
    }, 60 * 1000);

    // Ensure interval doesn't prevent Node process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Retrieve a value by key. O(1) amortized.
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Store a value with a Time-To-Live in milliseconds. O(1) amortized.
   */
  set(key, value, ttlMs = 60 * 1000) {
    // If cache exceeds maxSize, evict the oldest key (FIFO eviction using Map keys iterator)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a key. O(1).
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a given prefix. O(K).
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Prune expired entries to maintain tight space complexity.
   */
  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached items.
   */
  clear() {
    this.cache.clear();
  }
}

export const appCache = new MemoryCache(1000);
export default appCache;
