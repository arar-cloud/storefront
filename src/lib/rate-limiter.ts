/**
 * Rate limiting utility for high-load endpoints.
 * Provides per-IP and per-user rate limiting with configurable windows.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * In-memory rate limiter (suitable for single-instance deployments)
 * For distributed systems, use Redis-based limiter instead.
 */
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup expired records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Check if request should be allowed
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.store.get(key);
    
    if (!record) {
      // First request in this window
      this.store.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return true;
    }
    
    if (now > record.resetTime) {
      // Window expired, reset
      this.store.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return true;
    }
    
    if (record.count >= this.config.maxRequests) {
      // Rate limited
      return false;
    }
    
    record.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const record = this.store.get(key);
    if (!record) return this.config.maxRequests;
    
    const now = Date.now();
    if (now > record.resetTime) {
      return this.config.maxRequests;
    }
    
    return Math.max(0, this.config.maxRequests - record.count);
  }
  
  /**
   * Get reset time for a key (when rate limit will reset)
   */
  getResetTime(key: string): number {
    const record = this.store.get(key);
    return record?.resetTime ?? Date.now();
  }
  
  /**
   * Cleanup expired records to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  /**
   * Clear all rate limit records
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try X-Forwarded-For for proxy/loadbalancer scenarios
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take first IP if multiple IPs are present
    return forwardedFor.split(",")[0].trim();
  }
  
  // Fallback to generic identifier if no IP available
  return "unknown";
}

/**
 * Get user identifier from request (token, session cookie, etc.)
 */
export function getUserIdentifier(request: Request): string | null {
  // Try to extract from Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // For bearer tokens, use hash of token to avoid exposing it in logs
    const token = authHeader.slice(7);
    return `user:${hashToken(token)}`;
  }
  
  // Try to extract from session cookie
  const cookies = request.headers.get("cookie");
  if (cookies) {
    const sessionMatch = cookies.match(/session=([^;]+)/);
    if (sessionMatch) {
      return `session:${hashToken(sessionMatch[1])}`;
    }
  }
  
  return null;
}

/**
 * Simple hash function for tokens (not cryptographic, just for anonymization)
 */
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Pre-configured limiters for common endpoints

/**
 * Limiter for authentication endpoints (register, login, password reset)
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

/**
 * Limiter for sensitive operations (checkout, payment)
 * 10 requests per 5 minutes per user
 */
export const checkoutLimiter = new InMemoryRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
});

/**
 * Limiter for draft/preview endpoints
 * 20 requests per minute per IP
 */
export const draftLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
});

/**
 * Limiter for revalidation endpoints
 * 50 requests per 5 minutes per IP (internal use)
 */
export const revalidateLimiter = new InMemoryRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 50,
});

/**
 * Check rate limit and return response headers
 */
export function getRateLimitHeaders(limiter: InMemoryRateLimiter, key: string): Record<string, string> {
  return {
    "x-ratelimit-limit": limiter.constructor.name === "InMemoryRateLimiter" ? "5" : "unknown",
    "x-ratelimit-remaining": String(limiter.getRemaining(key)),
    "x-ratelimit-reset": String(limiter.getResetTime(key)),
  };
}
