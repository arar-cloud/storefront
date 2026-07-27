/**
 * Authentication input validation utilities
 * Ensures passwords and other sensitive inputs are properly sanitized
 */

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and sanitizes password input
 * @throws Error if password fails validation
 */
export function validatePassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const trimmed = password.trim();
  
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (trimmed.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  // Prevent null bytes and other control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    throw new Error('Password contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates email input
 * @throws Error if email fails validation
 */
export function validateEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }

  const trimmed = email.toLowerCase().trim();
  
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  if (trimmed.length > 254) {
    throw new Error('Email is too long');
  }

  return trimmed;
}

/**
 * Validates CSRF token format
 * @throws Error if token is invalid
 */
export function validateCSRFToken(token: unknown): string {
  if (typeof token !== 'string') {
    throw new Error('CSRF token must be a string');
  }

  // UUID v4 format validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token)) {
    throw new Error('Invalid CSRF token format');
  }

  return token;
}
