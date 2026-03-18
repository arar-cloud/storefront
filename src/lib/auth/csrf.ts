/**
 * CSRF Protection utilities
 */

import crypto from "crypto";

const CSRF_TOKENS = new Map<string, { token: string; expiresAt: number }>();
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createCSRFToken(sessionId: string): string {
  const token = generateCSRFToken();
  CSRF_TOKENS.set(sessionId, {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  });
  return token;
}

export function validateCSRFToken(
  sessionId: string,
  token: string
): boolean {
  const stored = CSRF_TOKENS.get(sessionId);

  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    CSRF_TOKENS.delete(sessionId);
    return false;
  }

  // Token matches and is valid
  const isValid = stored.token === token;
  if (isValid) {
    CSRF_TOKENS.delete(sessionId); // One-time use
  }
  return isValid;
}
