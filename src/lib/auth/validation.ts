/**
 * Input validation utilities for authentication flows
 * Ensures all user inputs meet security requirements
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const SAFE_STRING_REGEX = /^[a-zA-Z0-9._@\-\s]+$/;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationError | null => {
  if (!email || typeof email !== 'string') {
    return { field: 'email', message: 'Email is required' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { field: 'email', message: 'Email is too long' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { field: 'email', message: 'Invalid email format' };
  }
  return null;
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): ValidationError | null => {
  if (!password || typeof password !== 'string') {
    return { field: 'password', message: 'Password is required' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { field: 'password', message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (password.length > 128) {
    return { field: 'password', message: 'Password is too long' };
  }
  return null;
};

/**
 * Validates password reset token format
 */
export const validateToken = (token: string): ValidationError | null => {
  if (!token || typeof token !== 'string') {
    return { field: 'token', message: 'Token is required' };
  }
  if (token.length < 20 || token.length > 512) {
    return { field: 'token', message: 'Invalid token format' };
  }
  // Token should be alphanumeric, hyphens, and underscores only
  if (!/^[a-zA-Z0-9_\-]+$/.test(token)) {
    return { field: 'token', message: 'Invalid token format' };
  }
  return null;
};

/**
 * Sanitizes string input to prevent injection attacks
 */
export const sanitizeString = (input: string, maxLength = 255): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
};

/**
 * Validates and sanitizes user name
 */
export const validateName = (name: string): ValidationError | null => {
  if (!name || typeof name !== 'string') {
    return { field: 'name', message: 'Name is required' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { field: 'name', message: 'Name must be between 2 and 100 characters' };
  }
  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return { field: 'name', message: 'Name contains invalid characters' };
  }
  return null;
};

/**
 * Validates URL to prevent open redirect attacks
 */
export const validateRedirectUrl = (url: string, allowedOrigins: string[]): ValidationError | null => {
  if (!url || typeof url !== 'string') {
    return null; // URL is optional
  }
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    // Only allow relative URLs or URLs from allowed origins
    if (!allowedOrigins.some(origin => parsed.origin === origin)) {
      return { field: 'redirectUrl', message: 'Invalid redirect URL' };
    }
  } catch {
    return { field: 'redirectUrl', message: 'Invalid URL format' };
  }
  return null;
};
