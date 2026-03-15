/**
 * Session security utilities
 * Handles secure session token validation and management
 */

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
