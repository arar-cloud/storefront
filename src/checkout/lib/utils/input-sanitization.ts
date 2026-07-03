/**
 * Input sanitization utilities for checkout forms
 *
 * Provides validated, sanitized input processing to prevent XSS, injection attacks,
 * and data corruption in payment and shipping data flows.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization result type
 */
export interface SanitizationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

/**
 * Validates and sanitizes email addresses
 * - Trims whitespace
 * - Validates RFC 5322 basic format
 * - Rejects common injection patterns
 * - Returns sanitized value if valid
 */
export function sanitizeEmail(email: string): SanitizationResult {
  const errors: string[] = [];
  const trimmed = (email || '').trim();

  if (!trimmed) {
    errors.push('Email is required');
    return { isValid: false, sanitized: '', errors };
  }

  if (trimmed.length > 254) {
    errors.push('Email exceeds maximum length of 254 characters');
  }

  // Basic RFC 5322 validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    errors.push('Email format is invalid');
  }

  // Reject common injection patterns
  if (trimmed.includes(';') || trimmed.includes('%') || trimmed.includes('&lt;') || trimmed.includes('&gt;')) {
    errors.push('Email contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    sanitized: trimmed,
    errors,
  };
}

/**
 * Validates and sanitizes name fields (first, last, full name)
 * - Trims whitespace
 * - Validates length (2-100 chars)
 * - Removes control characters and suspicious patterns
 * - Allows common unicode letters, numbers, spaces, hyphens, apostrophes
 */
export function sanitizeName(name: string, fieldName: string = 'Name'): SanitizationResult {
  const errors: string[] = [];
  const trimmed = (name || '').trim();

  if (!trimmed) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, sanitized: '', errors };
  }

  if (trimmed.length < 2) {
    errors.push(`${fieldName} must be at least 2 characters`);
  }

  if (trimmed.length > 100) {
    errors.push(`${fieldName} must not exceed 100 characters`);
  }

  // Remove control characters
  const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');

  // Allow letters (including unicode), numbers, spaces, hyphens, apostrophes, periods
  // Reject HTML-like patterns and common injection vectors
  if (!/^[\p{L}\p{N}\s'\-\.]*$/u.test(cleaned)) {
    errors.push(`${fieldName} contains invalid characters`);
  }

  if (cleaned.includes('<') || cleaned.includes('>') || cleaned.includes('&') || cleaned.includes('"') || cleaned.includes(';')) {
    errors.push(`${fieldName} contains forbidden characters`);
  }

  return {
    isValid: errors.length === 0,
    sanitized: cleaned,
    errors,
  };
}

/**
 * Validates and sanitizes address fields (street, city, postal code, country)
 * - Trims whitespace
 * - Removes control characters
 * - Validates length constraints (3-120 chars)
 * - Allows unicode letters, numbers, common address punctuation
 */
export function sanitizeAddressField(value: string, fieldName: string = 'Address field'): SanitizationResult {
  const errors: string[] = [];
  const trimmed = (value || '').trim();

  if (!trimmed) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, sanitized: '', errors };
  }

  if (trimmed.length < 3) {
    errors.push(`${fieldName} must be at least 3 characters`);
  }

  if (trimmed.length > 120) {
    errors.push(`${fieldName} must not exceed 120 characters`);
  }

  // Remove control characters
  const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');

  // Allow unicode letters, numbers, spaces, common punctuation for addresses
  if (!/^[\p{L}\p{N}\s'\-,./()]*$/u.test(cleaned)) {
    errors.push(`${fieldName} contains invalid characters`);
  }

  // Reject injection patterns
  if (cleaned.includes('<') || cleaned.includes('>') || cleaned.includes(';') || cleaned.includes('&lt;') || cleaned.includes('&gt;')) {
    errors.push(`${fieldName} contains forbidden characters`);
  }

  return {
    isValid: errors.length === 0,
    sanitized: cleaned,
    errors,
  };
}

/**
 * Validates country code format (ISO 3166-1 alpha-2)
 * - Must be exactly 2 uppercase letters
 * - Prevents code injection
 */
export function sanitizeCountryCode(code: string): SanitizationResult {
  const errors: string[] = [];
  const trimmed = (code || '').trim().toUpperCase();

  if (!trimmed) {
    errors.push('Country code is required');
    return { isValid: false, sanitized: '', errors };
  }

  if (!/^[A-Z]{2}$/.test(trimmed)) {
    errors.push('Country code must be a valid 2-letter ISO code');
  }

  return {
    isValid: errors.length === 0,
    sanitized: trimmed,
    errors,
  };
}

/**
 * Validates phone number format
 * - Allows digits, spaces, hyphens, parentheses, plus sign
 * - Must be 7-20 characters after removing formatting
 * - Prevents injection patterns
 */
export function sanitizePhoneNumber(phone: string): SanitizationResult {
  const errors: string[] = [];
  const trimmed = (phone || '').trim();

  if (!trimmed) {
    errors.push('Phone number is required');
    return { isValid: false, sanitized: '', errors };
  }

  // Remove common formatting characters to check actual digit count
  const digitsOnly = trimmed.replace(/[\s\-().+]/g, '');

  if (digitsOnly.length < 7) {
    errors.push('Phone number must contain at least 7 digits');
  }

  if (digitsOnly.length > 20) {
    errors.push('Phone number must not exceed 20 digits');
  }

  // Allow only digits, spaces, hyphens, parentheses, plus
  if (!/^[\d\s\-().+]*$/.test(trimmed)) {
    errors.push('Phone number contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    sanitized: trimmed,
    errors,
  };
}

/**
 * HTML entity encoding for safe display
 * Prevents XSS when rendering user-supplied data
 */
export function encodeHtmlEntities(text: string): string {
  const div = new DOMPurify().default || DOMPurify;
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates an object containing multiple address fields
 * Returns sanitized object and combined error list
 */
export function sanitizeAddressObject(
  address: Record<string, any>,
  requiredFields: string[] = []
): { isValid: boolean; sanitized: Record<string, string>; errors: string[] } {
  const errors: string[] = [];
  const sanitized: Record<string, string> = {};

  const fieldValidators: Record<string, (value: string) => SanitizationResult> = {
    firstName: (v) => sanitizeName(v, 'First name'),
    lastName: (v) => sanitizeName(v, 'Last name'),
    email: (v) => sanitizeEmail(v),
    street: (v) => sanitizeAddressField(v, 'Street address'),
    city: (v) => sanitizeAddressField(v, 'City'),
    postalCode: (v) => sanitizeAddressField(v, 'Postal code'),
    country: (v) => sanitizeCountryCode(v),
    phone: (v) => sanitizePhoneNumber(v),
  };

  for (const [field, validator] of Object.entries(fieldValidators)) {
    if (field in address) {
      const result = validator(address[field]);
      if (!result.isValid) {
        errors.push(...result.errors);
      } else {
        sanitized[field] = result.sanitized;
      }
    } else if (requiredFields.includes(field)) {
      errors.push(`${field} is required`);
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
}
