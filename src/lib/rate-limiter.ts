/**
 * Rate limiting utilities for authentication endpoints
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  register: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Checks if a request should be rate limited
 * @param identifier - IP address or user identifier
 * @param action - Type of action (login, passwordReset, register)
 * @returns Whether the request is rate limited
 */
export function checkRateLimit(identifier: string, action: keyof typeof RATE_LIMIT_CONFIG): boolean {
  const config = RATE_LIMIT_CONFIG[action];
  const key = `${action}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }

  if (now > entry.resetTime) {
    // Window expired, reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }

  // Within window
  if (entry.count >= config.maxAttempts) {
    return true; // Rate limited
  }

  entry.count++;
  return false; // Not rate limited yet
}

/**
 * Get remaining attempts before rate limit
 */
export function getRemainingAttempts(identifier: string, action: keyof typeof RATE_LIMIT_CONFIG): number {
  const config = RATE_LIMIT_CONFIG[action];
  const key = `${action}:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || Date.now() > entry.resetTime) {
    return config.maxAttempts;
  }

  return Math.max(0, config.maxAttempts - entry.count);
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string, action: keyof typeof RATE_LIMIT_CONFIG): void {
  const key = `${action}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Cleanup old entries from rate limit store (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime + 60000) { // Keep entries for 1 min after expiry
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 30 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimitStore, 30 * 60 * 1000);
}
