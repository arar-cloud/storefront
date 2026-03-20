import crypto from 'crypto';
import { timingSafeEqual } from 'crypto';

/**
 * Generate a secure CSRF token
 * @returns {string} A URL-safe CSRF token (base64 encoded random bytes)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Validate CSRF token with timing-attack safe comparison
 * @param {string} tokenFromRequest - CSRF token from request (header or body)
 * @param {string} tokenFromSession - CSRF token stored in session/cookie
 * @returns {boolean} True if tokens match, false otherwise
 */
export function validateCsrfToken(tokenFromRequest: string, tokenFromSession: string): boolean {
  if (!tokenFromRequest || !tokenFromSession) {
    return false;
  }

  try {
    const requestBuffer = Buffer.from(tokenFromRequest, 'utf-8');
    const sessionBuffer = Buffer.from(tokenFromSession, 'utf-8');
    
    if (requestBuffer.length !== sessionBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(requestBuffer, sessionBuffer);
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers with fallback to body
 * @param {any} request - NextJS Request object
 * @returns {string | null} CSRF token or null if not found
 */
export function extractCsrfToken(request: any): string | null {
  const headerToken = request.headers.get?.('x-csrf-token') || 
                      request.headers['x-csrf-token'];
  
  if (headerToken) {
    return headerToken;
  }
  
  // Note: For body tokens, extract during JSON parsing in calling code
  return null;
}
