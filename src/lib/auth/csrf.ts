// Security: CSRF (Cross-Site Request Forgery) protection utilities
// Validates that requests originate from same-origin contexts

import { headers } from "next/headers";

/**
 * Get the origin from request headers
 * Security: Validate origin header matches expected domain
 */
export function getRequestOrigin(): string | null {
  try {
    const headersList = headers();
    // Try Referer header first (most reliable)
    const referer = headersList.get("referer");
    if (referer) {
      return new URL(referer).origin;
    }
    // Fallback to Origin header
    return headersList.get("origin");
  } catch (error) {
    console.error("[CSRF] Failed to extract origin:", error);
    return null;
  }
}

/**
 * Get expected origin from environment
 * Security: Should match your deployed domain(s)
 */
export function getExpectedOrigin(): string | null {
  // In production, validate against your deployed domain
  // For development, allow localhost
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
  }
  return process.env.NEXT_PUBLIC_STOREFRONT_URL || null;
}

/**
 * Validate CSRF for same-origin requests
 * Security: Prevent cross-origin state-changing requests
 */
export function validateCSRFOrigin(requestOrigin: string | null, expectedOrigin: string | null): boolean {
  if (!requestOrigin || !expectedOrigin) {
    // If we can't determine origins, reject as unsafe
    return false;
  }

  try {
    const requestUrl = new URL(requestOrigin);
    const expectedUrl = new URL(expectedOrigin);

    // Validate hostname matches (prevent subdomain takeover attacks)
    if (requestUrl.hostname !== expectedUrl.hostname) {
      console.warn(`[CSRF] Origin mismatch: ${requestUrl.hostname} vs ${expectedUrl.hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[CSRF] Failed to validate origin:", error);
    return false;
  }
}
