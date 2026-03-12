/**
 * Secure session token handling.
 * SECURITY: All tokens use HttpOnly, Secure, and SameSite flags.
 * @security-review session-token-hardening
 */

export interface SessionTokenOptions {
  maxAge?: number;
  domain?: string;
  path?: string;
}

/**
 * Generate secure cookie attributes for session tokens.
 * - HttpOnly: Prevents JavaScript from accessing the cookie (XSS protection)
 * - Secure: Only sent over HTTPS connections
 * - SameSite=Strict: Prevents CSRF attacks
 */
export const getSecureCookieOptions = (options?: SessionTokenOptions) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction || process.env.FORCE_SECURE_COOKIES === 'true',
    sameSite: 'strict' as const,
    maxAge: options?.maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days default
    domain: options?.domain,
    path: options?.path || '/',
  };
};

/**
 * Validate session token format and prevent token injection attacks.
 * @security-review token-validation
 */
export const validateSessionToken = (token: unknown): token is string => {
  if (typeof token !== 'string') return false;
  if (token.length < 20 || token.length > 500) return false;
  // JWT/session tokens should only contain alphanumeric, dots, hyphens, underscores
  if (!/^[A-Za-z0-9._-]+$/.test(token)) return false;
  return true;
};

/**
 * Prevent cookie injection by validating cookie names and values.
 * @security-review cookie-injection-prevention
 */
export const validateCookieName = (name: string): boolean => {
  // Cookie names should not contain special characters that could break header parsing
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 64;
};
