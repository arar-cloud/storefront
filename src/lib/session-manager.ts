/**
 * Session management and token lifecycle utilities
 */

import { cookies } from "next/headers";

interface SessionToken {
  id: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  refreshTokenId?: string;
}

const SESSION_CONFIG = {
  accessTokenTTL: 15 * 60 * 1000, // 15 minutes
  refreshTokenTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  absoluteSessionTTL: 30 * 24 * 60 * 60 * 1000, // 30 days max
};

/**
 * Validates session token expiration
 */
export function isSessionTokenValid(token: SessionToken): boolean {
  const now = Date.now();

  // Check if token has expired
  if (now > token.expiresAt) {
    return false;
  }

  // Check absolute session TTL
  if (now - token.issuedAt > SESSION_CONFIG.absoluteSessionTTL) {
    return false;
  }

  return true;
}

/**
 * Check if session token needs refresh
 */
export function shouldRefreshToken(token: SessionToken): boolean {
  const now = Date.now();
  const timeRemaining = token.expiresAt - now;
  const refreshThreshold = SESSION_CONFIG.accessTokenTTL * 0.3; // Refresh if 30% time remaining

  return timeRemaining < refreshThreshold;
}

/**
 * Generate new session token
 */
export function createSessionToken(userId: string, refreshTokenId?: string): SessionToken {
  const now = Date.now();
  return {
    id: generateTokenId(),
    userId,
    issuedAt: now,
    expiresAt: now + SESSION_CONFIG.accessTokenTTL,
    refreshTokenId,
  };
}

/**
 * Refresh session token
 */
export function refreshSessionToken(oldToken: SessionToken): SessionToken | null {
  // Validate old token is not expired beyond refresh window
  const now = Date.now();
  const refreshWindow = SESSION_CONFIG.refreshTokenTTL;

  if (now - oldToken.issuedAt > refreshWindow) {
    return null; // Cannot refresh, too old
  }

  // Check absolute session TTL
  if (now - oldToken.issuedAt > SESSION_CONFIG.absoluteSessionTTL) {
    return null; // Session expired absolutely
  }

  return createSessionToken(oldToken.userId, oldToken.refreshTokenId);
}

/**
 * Validate session has not been reused
 */
export function validateSessionNonReuse(previousTokenId: string, currentTokenId: string): boolean {
  // In production, check against revoked tokens list
  // For now, ensure different token IDs
  return previousTokenId !== currentTokenId;
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session-token')?.value;

    if (!sessionCookie) {
      return null;
    }

    const token: SessionToken = JSON.parse(
      Buffer.from(sessionCookie, 'base64').toString('utf-8')
    );

    if (!isSessionTokenValid(token)) {
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Set session in cookies
 */
export async function setSession(token: SessionToken): Promise<void> {
  try {
    const cookieStore = await cookies();
    const tokenString = Buffer.from(JSON.stringify(token)).toString('base64');

    cookieStore.set('session-token', tokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_CONFIG.accessTokenTTL / 1000,
      path: '/',
    });
  } catch (error) {
    console.error('Error setting session:', error);
  }
}

/**
 * Clear session
 */
export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session-token');
    cookieStore.delete('csrf-token');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Generate cryptographically secure token ID
 */
function generateTokenId(): string {
  return require('crypto').randomUUID();
}
