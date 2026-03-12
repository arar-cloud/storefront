/**
 * Rate limiting for authentication endpoints.
 * Prevents brute force attacks on sensitive operations.
 * @security-review rate-limiting-auth
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store. For production, use Redis.
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Configuration for different auth operations.
 */
const RATE_LIMIT_CONFIG = {
  register: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  login: { maxAttempts: 10, windowMs: 15 * 60 * 1000 }, // 10 attempts per 15 min
  resetPassword: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  setPassword: { maxAttempts: 5, windowMs: 30 * 60 * 1000 }, // 5 attempts per 30 min
};

/**
 * Check if request is rate limited.
 * Returns true if limit exceeded, false if allowed.
 */
export const isRateLimited = (
  identifier: string,
  operation: keyof typeof RATE_LIMIT_CONFIG
): boolean => {
  const config = RATE_LIMIT_CONFIG[operation];
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // No previous record, initialize
  if (!record) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }
  
  // Window expired, reset
  if (now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }
  
  // Increment count
  record.count += 1;
  
  // Check if limit exceeded
  return record.count > config.maxAttempts;
};

/**
 * Get remaining attempts for a rate-limited operation.
 */
export const getRemainingAttempts = (
  identifier: string,
  operation: keyof typeof RATE_LIMIT_CONFIG
): number => {
  const config = RATE_LIMIT_CONFIG[operation];
  const record = rateLimitStore.get(identifier);
  
  if (!record || Date.now() > record.resetTime) {
    return config.maxAttempts;
  }
  
  return Math.max(0, config.maxAttempts - record.count);
};

/**
 * Clear rate limit for identifier (e.g., on successful auth).
 */
export const clearRateLimit = (identifier: string): void => {
  rateLimitStore.delete(identifier);
};

/**
 * Clean up expired records periodically.
 * Call this from a scheduled task or middleware.
 */
export const cleanupExpiredRecords = (): void => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};
