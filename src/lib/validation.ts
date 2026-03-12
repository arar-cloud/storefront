/**
 * Input validation utilities for GraphQL mutations
 * Prevents injection attacks and malformed data from reaching GraphQL layer
 */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email must be a string' });
    return { valid: false, errors };
  }
  
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (trimmed.length > 254) {
    errors.push({ field: 'email', message: 'Email too long' });
  }
  
  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password must be a string' });
    return { valid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  
  if (password.length > 256) {
    errors.push({ field: 'password', message: 'Password too long' });
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateResetToken(token: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (typeof token !== 'string') {
    errors.push({ field: 'token', message: 'Token must be a string' });
    return { valid: false, errors };
  }
  
  if (token.length === 0) {
    errors.push({ field: 'token', message: 'Token cannot be empty' });
  }
  
  if (token.length > 500) {
    errors.push({ field: 'token', message: 'Token too long' });
  }
  
  // Prevent common XSS patterns
  if (token.includes('<') || token.includes('>') || token.includes('javascript:')) {
    errors.push({ field: 'token', message: 'Invalid token format' });
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateFormData(data: Record<string, unknown>): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (typeof data !== 'object' || data === null) {
    errors.push({ field: 'data', message: 'Input must be an object' });
    return { valid: false, errors };
  }
  
  // Prevent prototype pollution
  if ('__proto__' in data || 'constructor' in data) {
    errors.push({ field: 'data', message: 'Invalid data structure' });
  }
  
  return { valid: errors.length === 0, errors };
}
