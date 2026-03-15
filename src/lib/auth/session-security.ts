/**
 * Session security utilities
 * Handles secure session token validation and management
 */

// In-memory store for rate limiting (replace with Redis in production)
const tokenAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

// Clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenAttempts.entries()) {
    if (value.resetTime < now) {
      tokenAttempts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

/**
 * Validate session token format and length
 * Session tokens should follow strict format rules
 */
export const validateSessionToken = (token: unknown): token is string => {
  if (typeof token !== 'string') return false;
  if (token.length < 20 || token.length > 500) return false;
  // JWT/session tokens should only contain alphanumeric, dots, hyphens, underscores
  if (!/^[A-Za-z0-9._-]+$/.test(token)) return false;
  return true;
};

/**
 * Extract and validate session token from cookies
 * Never trust cookie values without validation
 */
export const getValidatedSessionToken = (cookieValue: unknown): string | null => {
  if (!validateSessionToken(cookieValue)) {
    return null;
  }
  return cookieValue;
};

/**
 * Check if session token matches expected format
 * Prevents malformed tokens from reaching authentication logic
 */
export const isValidTokenFormat = (token: string): boolean => {
  // Session tokens should have structure like JWT (3 parts separated by dots)
  // or standard session token format
  const parts = token.split('.');
  if (parts.length < 2 || parts.length > 4) return false;
  
  // Each part should be non-empty and contain only valid characters
  return parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
};

/**
 * Validate token expiration
 * Always check token age in session validation
 */
export const validateTokenExpiration = (
  issuedAt: number,
  expiresIn: number,
  now: number = Date.now()
): boolean => {
  const tokenAge = now - issuedAt;
  return tokenAge > 0 && tokenAge < expiresIn;
};

/**
 * Check rate limit for sensitive token operations
 * Prevents brute force attacks on token validation and similar operations
 */
export const checkTokenRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const attempt = tokenAttempts.get(identifier);
  
  if (!attempt) {
    tokenAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true; // Allow first attempt
  }
  
  if (now > attempt.resetTime) {
    // Window expired, reset counter
    tokenAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempt.count >= MAX_ATTEMPTS) {
    return false; // Rate limit exceeded
  }
  
  attempt.count++;
  return true; // Allow attempt
};

/**
 * Constant-time token comparison to prevent timing attacks
 */
export const constantTimeTokenCompare = (provided: string, expected: string): boolean => {
  if (provided.length !== expected.length) return false;
  
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
};
