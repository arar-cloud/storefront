import crypto from 'crypto';

/**
 * Session management security utilities
 * Prevents session fixation and hijacking attacks
 */

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const SESSIONS = new Map<string, Session>();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a new secure session after successful login
 * Invalidates any previous session to prevent fixation
 */
export const createSession = (userId: string, oldSessionId?: string): Session => {
  // Invalidate old session
  if (oldSessionId) {
    SESSIONS.delete(oldSessionId);
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = {
    id: sessionId,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
  };

  SESSIONS.set(sessionId, session);
  return session;
};

/**
 * Validate session: check existence and expiration
 */
export const validateSession = (sessionId: string): Session | null => {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    SESSIONS.delete(sessionId);
    return null;
  }

  return session;
};

/**
 * Destroy session on logout
 */
export const destroySession = (sessionId: string): void => {
  SESSIONS.delete(sessionId);
};

/**
 * Cleanup expired sessions (call periodically)
 */
export const cleanupExpiredSessions = (): void => {
  const now = Date.now();
  for (const [id, session] of SESSIONS.entries()) {
    if (now > session.expiresAt) {
      SESSIONS.delete(id);
    }
  }
};
