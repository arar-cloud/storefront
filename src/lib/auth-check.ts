/**
 * Authorization utilities for order and account data access
 */

import { cookies } from "next/headers";

/**
 * Get current authenticated user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return null;
    }
    
    // Validate token format (basic check)
    if (typeof authToken !== 'string' || authToken.length === 0) {
      return null;
    }
    
    // Decode token to extract user ID (assuming JWT or similar)
    // This should be implemented based on your actual auth system
    try {
      const parts = authToken.split('.');
      if (parts.length !== 3) return null; // Invalid JWT format
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

/**
 * Verify user has access to order data
 * @throws Error if unauthorized
 */
export async function authorizeOrderAccess(requestedUserId: string): Promise<void> {
  const currentUserId = await getCurrentUserId();
  
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }
  
  if (currentUserId !== requestedUserId) {
    throw new Error('Unauthorized: Cannot access other users\' order data');
  }
}

/**
 * Verify CSRF token matches session
 */
export async function validateSessionCSRFToken(providedToken: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const storedToken = cookieStore.get('csrf-token')?.value;
    
    if (!storedToken) {
      return false;
    }
    
    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(providedToken, storedToken);
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
