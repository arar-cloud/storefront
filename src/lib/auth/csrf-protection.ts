import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_COOKIE_NAME = 'csrf-cookie';
const TOKEN_EXPIRY_MS = 1800000; // 30 minutes

interface TokenData {
  token: string;
  issuedAt: number;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a CSRF token with timestamp for validation
 */
export async function createCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const tokenData: TokenData = {
    token,
    issuedAt: Date.now(),
  };
  
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, JSON.stringify(tokenData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY_MS / 1000,
    path: '/',
  });
  
  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(providedToken: string): Promise<boolean> {
  if (!providedToken || typeof providedToken !== 'string') {
    return false;
  }
  
  try {
    const cookieStore = await cookies();
    const storedData = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (!storedData) {
      return false;
    }
    
    const tokenData: TokenData = JSON.parse(storedData);
    const isExpired = Date.now() - tokenData.issuedAt > TOKEN_EXPIRY_MS;
    
    if (isExpired) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(tokenData.token)
    );
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Clear CSRF token (e.g., after logout)
 */
export async function clearCSRFToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
