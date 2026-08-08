/**
 * API security utilities for HTTPS enforcement and CSRF protection
 */

import { headers } from "next/headers";

/**
 * Verify request is over HTTPS (or localhost for development)
 */
export async function enforceHTTPS(): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Allow HTTP in development
  }

  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';

  if (protocol !== 'https') {
    throw new Error('HTTPS required');
  }

  return true;
}

/**
 * Get request origin for CSRF validation
 */
export async function getRequestOrigin(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('origin') || headersList.get('referer')?.split('/')[2] || null;
}

/**
 * Verify origin matches allowed domains
 */
export async function validateRequestOrigin(): Promise<boolean> {
  const origin = await getRequestOrigin();

  if (!origin) {
    return false;
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_CHECKOUT_URL,
  ].filter(Boolean);

  // Extract domain from origin
  try {
    const originUrl = new URL(`https://${origin}`);
    const originDomain = originUrl.hostname;

    return allowedOrigins.some((allowed) => {
      const allowedUrl = new URL(allowed || 'https://localhost');
      return originDomain === allowedUrl.hostname;
    });
  } catch {
    return false;
  }
}

/**
 * Get CSRF token from request
 */
export async function getCSRFTokenFromRequest(
  method: string,
  formData?: FormData
): Promise<string | null> {
  // CSRF token only needed for state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  if (formData && formData.has('csrf_token')) {
    const token = formData.get('csrf_token');
    return typeof token === 'string' ? token : null;
  }

  const headersList = await headers();
  return headersList.get('x-csrf-token');
}

/**
 * API request builder with security features
 */
export class SecureAPIRequest {
  private method: string;
  private url: string;
  private headers: Record<string, string>;
  private body?: unknown;

  constructor(method: string, url: string) {
    this.method = method;
    this.url = url;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Add CSRF token to request
   */
  withCSRFToken(token: string): this {
    this.headers['X-CSRF-Token'] = token;
    return this;
  }

  /**
   * Add request body
   */
  withBody(body: unknown): this {
    this.body = body;
    return this;
  }

  /**
   * Add custom headers
   */
  withHeaders(headers: Record<string, string>): this {
    Object.assign(this.headers, headers);
    return this;
  }

  /**
   * Build and validate request
   */
  async build(): Promise<RequestInit> {
    // Enforce HTTPS
    await enforceHTTPS();

    // Validate origin
    const originValid = await validateRequestOrigin();
    if (!originValid && process.env.NODE_ENV === 'production') {
      throw new Error('Invalid request origin');
    }

    // Validate URL is HTTPS (in production)
    if (process.env.NODE_ENV === 'production' && !this.url.startsWith('https://')) {
      throw new Error('Only HTTPS endpoints allowed');
    }

    const request: RequestInit = {
      method: this.method,
      headers: this.headers,
    };

    if (this.body) {
      request.body = JSON.stringify(this.body);
    }

    return request;
  }
}
