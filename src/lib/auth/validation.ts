/**
 * Input validation utilities for authentication endpoints
 * Provides consistent validation across all auth routes
 */

// Email validation pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  if (email.length > 254) {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength
 * Requirements: min 8 chars, at least one uppercase, one lowercase, one number
 */
export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  if (password.length < 8) {
    return false;
  }
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Removes potentially dangerous characters
 */
export function sanitizeInput(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  let str = String(input).trim();
  
  // Remove HTML/script tags
  str = str.replace(/<[^>]*>/g, '');
  
  // Remove SQL-like keywords to prevent basic injection
  str = str.replace(/('|(\-\-)|(;)|(\|\|)|(\*))/g, '');
  
  // Limit length to prevent buffer overflow
  if (str.length > 500) {
    str = str.substring(0, 500);
  }
  
  return str;
}

/**
 * Validate token format (base64-like pattern)
 */
export function isValidToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  if (token.length < 10 || token.length > 1000) {
    return false;
  }
  // Basic check for base64-like format
  return /^[A-Za-z0-9+/=-]+$/.test(token);
}

/**
 * Validate password reset token
 */
export function isValidResetToken(token: string): boolean {
  return isValidToken(token);
}
