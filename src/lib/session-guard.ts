/**
 * Session validation and synchronization utilities.
 * Ensures consistent session state before rendering authenticated components.
 */

interface SessionState {
  isAuthenticated: boolean;
  userId: string | null;
  sessionToken: string | null;
  expiresAt: number | null;
  lastValidatedAt: number;
}

const SESSION_VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_BUFFER_MS = 30 * 1000; // 30 seconds

let currentSession: SessionState | null = null;
let validationSchedule: NodeJS.Timeout | null = null;

/**
 * Initialize session state from storage or API.
 */
export async function initializeSession(): Promise<SessionState> {
  if (currentSession && !isSessionExpired(currentSession)) {
    return currentSession;
  }

  // Try to recover from storage
  const stored = getStoredSession();
  if (stored && !isSessionExpired(stored)) {
    currentSession = stored;
    scheduleSessionValidation();
    return currentSession;
  }

  // Initialize new session
  currentSession = {
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    expiresAt: null,
    lastValidatedAt: Date.now(),
  };

  scheduleSessionValidation();
  return currentSession;
}

/**
 * Validate current session state.
 * Optionally refresh from server if validation interval exceeded.
 */
export async function validateSession(
  forceRefresh: boolean = false,
): Promise<{ valid: boolean; reason?: string }> {
  if (!currentSession) {
    await initializeSession();
  }

  if (!currentSession) {
    return { valid: false, reason: 'Session not initialized' };
  }

  // Check expiration
  if (isSessionExpired(currentSession)) {
    await clearSession();
    return { valid: false, reason: 'Session expired' };
  }

  // Check if refresh needed
  const timeSinceValidation = Date.now() - currentSession.lastValidatedAt;
  if (forceRefresh || timeSinceValidation > SESSION_VALIDATION_INTERVAL_MS) {
    try {
      const refreshed = await refreshSessionFromServer();
      if (!refreshed) {
        return { valid: false, reason: 'Failed to refresh session' };
      }
    } catch (error) {
      console.error('[SessionGuard] Failed to refresh session:', error);
      // Allow stale session if refresh fails temporarily
      if (currentSession.isAuthenticated) {
        return { valid: true, reason: 'Using stale session due to refresh failure' };
      }
      return { valid: false, reason: 'Session refresh failed' };
    }
  }

  return { valid: currentSession.isAuthenticated, reason: 'Session valid' };
}

/**
 * Update session after authentication.
 */
export function setAuthenticatedSession(
  userId: string,
  sessionToken: string,
  expiresIn: number,
): void {
  const now = Date.now();
  currentSession = {
    isAuthenticated: true,
    userId,
    sessionToken,
    expiresAt: now + expiresIn,
    lastValidatedAt: now,
  };

  // Store session
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem('checkout_session', JSON.stringify(currentSession));
    } catch (e) {
      console.error('[SessionGuard] Failed to store session:', e);
    }
  }

  scheduleSessionValidation();
}

/**
 * Clear session on logout or expiry.
 */
export async function clearSession(): Promise<void> {
  currentSession = {
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    expiresAt: null,
    lastValidatedAt: Date.now(),
  };

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem('checkout_session');
    } catch (e) {
      console.error('[SessionGuard] Failed to clear session:', e);
    }
  }

  if (validationSchedule) {
    clearTimeout(validationSchedule);
    validationSchedule = null;
  }
}

/**
 * Get current session state safely.
 */
export function getCurrentSession(): SessionState | null {
  return currentSession;
}

/**
 * Check if session is expired (with buffer).
 */
function isSessionExpired(session: SessionState): boolean {
  if (!session.expiresAt) return false;
  return Date.now() > session.expiresAt - SESSION_EXPIRY_BUFFER_MS;
}

/**
 * Retrieve stored session from sessionStorage.
 */
function getStoredSession(): SessionState | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const stored = window.sessionStorage.getItem('checkout_session');
    if (!stored) return null;
    return JSON.parse(stored) as SessionState;
  } catch (e) {
    console.error('[SessionGuard] Failed to retrieve stored session:', e);
    return null;
  }
}

/**
 * Refresh session from server.
 */
async function refreshSessionFromServer(): Promise<boolean> {
  if (!currentSession?.sessionToken) return false;

  try {
    const response = await fetch('/api/checkout/session/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.sessionToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await clearSession();
      }
      return false;
    }

    const data = await response.json();
    if (currentSession) {
      currentSession.lastValidatedAt = Date.now();
      if (data.expiresIn) {
        currentSession.expiresAt = Date.now() + data.expiresIn;
      }
    }

    return true;
  } catch (error) {
    console.error('[SessionGuard] Session refresh error:', error);
    return false;
  }
}

/**
 * Schedule periodic session validation.
 */
function scheduleSessionValidation(): void {
  if (validationSchedule) {
    clearTimeout(validationSchedule);
  }

  validationSchedule = setTimeout(
    () => {
      validateSession(true).catch((e) => console.error('[SessionGuard] Validation error:', e));
      scheduleSessionValidation();
    },
    SESSION_VALIDATION_INTERVAL_MS,
  );
}
