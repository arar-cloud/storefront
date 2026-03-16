import crypto from 'crypto';

/**
 * CSRF token generation and validation
 * Prevents cross-site request forgery attacks
 */

const TOKEN_LENGTH = 32;
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface CSRFTokenPayload {
  token: string;
  issuedAt: number;
}

/**
 * Generate a secure random CSRF token
 */
export const generateCSRFToken = (): CSRFTokenPayload => {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  return {
    token,
    issuedAt: Date.now(),
  };
};

/**
 * Validate CSRF token: check existence and TTL
 */
export const validateCSRFToken = (
  providedToken: string,
  storedPayload: CSRFTokenPayload | null
): { valid: boolean; reason?: string } => {
  if (!storedPayload) {
    return { valid: false, reason: 'CSRF token not found' };
  }

  if (providedToken !== storedPayload.token) {
    return { valid: false, reason: 'CSRF token mismatch' };
  }

  const age = Date.now() - storedPayload.issuedAt;
  if (age > TOKEN_TTL) {
    return { valid: false, reason: 'CSRF token expired' };
  }

  return { valid: true };
};
