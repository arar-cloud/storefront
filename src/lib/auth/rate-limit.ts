/**
 * Simple in-memory rate limiter for auth endpoints.
 * In production, use Redis or similar distributed cache.
 */

interface RateLimitStore {
  [key: string]: { attempts: number; resetTime: number };
}

const store: RateLimitStore = {};
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = store[identifier];

  if (!record || now > record.resetTime) {
    store[identifier] = {
      attempts: 1,
      resetTime: now + WINDOW_MS,
    };
    return true; // Allow
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return false; // Reject
  }

  record.attempts++;
  return true; // Allow
}

export function getRateLimitRemaining(identifier: string): number {
  const record = store[identifier];
  if (!record) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - record.attempts);
}
