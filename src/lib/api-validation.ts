/**
 * API request validation utilities
 * Validates and sanitizes incoming request bodies for security
 */

import { validateEmail, validatePassword, validateToken } from './auth/validation';

export interface ValidationResponse {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates register request body
 */
export const validateRegisterRequest = (body: unknown): ValidationResponse => {
  const errors: Record<string, string> = {};
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { body: 'Invalid request body' } };
  }
  
  const data = body as Record<string, unknown>;
  
  // Validate email
  const emailError = validateEmail(String(data.email || ''));
  if (emailError) errors.email = emailError.message;
  
  // Validate password
  const passwordError = validatePassword(String(data.password || ''));
  if (passwordError) errors.password = passwordError.message;
  
  // Validate confirmation password if provided
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates password reset request body
 */
export const validateResetPasswordRequest = (body: unknown): ValidationResponse => {
  const errors: Record<string, string> = {};
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { body: 'Invalid request body' } };
  }
  
  const data = body as Record<string, unknown>;
  
  // Validate email or token
  if (data.email) {
    const emailError = validateEmail(String(data.email));
    if (emailError) errors.email = emailError.message;
  }
  
  if (data.token) {
    const tokenError = validateToken(String(data.token));
    if (tokenError) errors.token = tokenError.message;
  }
  
  if (!data.email && !data.token) {
    errors.request = 'Either email or token is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates set password request body
 */
export const validateSetPasswordRequest = (body: unknown): ValidationResponse => {
  const errors: Record<string, string> = {};
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { body: 'Invalid request body' } };
  }
  
  const data = body as Record<string, unknown>;
  
  // Validate token
  const tokenError = validateToken(String(data.token || ''));
  if (tokenError) errors.token = tokenError.message;
  
  // Validate new password
  const passwordError = validatePassword(String(data.password || ''));
  if (passwordError) errors.password = passwordError.message;
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Generic request body size validator
 */
export const validateRequestSize = (body: string, maxBytes = 1024 * 10): boolean => {
  return Buffer.byteLength(body, 'utf8') <= maxBytes;
};

/**
 * Validates URL parameters to prevent injection
 */
export const validateUrlParam = (param: string | string[] | undefined, maxLength = 255): string | null => {
  if (!param) return null;
  
  // Handle array params
  if (Array.isArray(param)) {
    param = param[0];
  }
  
  if (typeof param !== 'string' || param.length > maxLength) {
    return null;
  }
  
  return param.trim();
};
