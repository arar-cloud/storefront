/**
 * CSRF (Cross-Site Request Forgery) protection utilities
 * Generates and validates CSRF tokens for state-changing operations
 */

import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '__csrf';

/**
 * Generates a secure random CSRF token
 */
export const generateCsrfToken = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use crypto API
    const array = new Uint8Array(CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Server-side: use crypto module
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }
};

/**
 * Retrieves CSRF token from cookie or generates new one
 */
export const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return generateCsrfToken();
  
  // Try to get existing token from cookie
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  if (match) {
    return decodeURIComponent(match[2]);
  }
  
  // Generate new token
  const token = generateCsrfToken();
  
  // Store in cookie
  let cookieString = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`;
  cookieString += "; path=/";
  cookieString += "; SameSite=Strict";
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    cookieString += "; Secure";
  }
  document.cookie = cookieString;
  
  return token;
};

/**
 * Validates CSRF token against stored value
 */
export const validateCsrfToken = (token: string, stored: string): boolean => {
  if (!token || !stored || typeof token !== 'string' || typeof stored !== 'string') {
    return false;
  }
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingConstantTimeEqual(Buffer.from(token), Buffer.from(stored));
};

/**
 * Extracts CSRF token from request headers
 */
export const getCsrfTokenFromRequest = (headers: Record<string, string | undefined>): string | null => {
  const token = headers['x-csrf-token'] || headers['x-csrftoken'];
  return token || null;
};
