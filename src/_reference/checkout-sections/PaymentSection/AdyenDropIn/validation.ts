import crypto from 'crypto';
import { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

/**
 * Validate email format and length
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email too long' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validate password: minimum length, encoding check, no control chars
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password too long' };
  }
  
  // Check for null bytes and control characters
  if (/[\x00-\x1F\x7F]/g.test(password)) {
    return { valid: false, error: 'Password contains invalid characters' };
  }
  
  // Verify UTF-8 encoding
  try {
    Buffer.from(password, 'utf8').toString('utf8');
  } catch (e) {
    return { valid: false, error: 'Invalid password encoding' };
  }
  
  return { valid: true };
}

/**
 * Validate redirect URL is internal or to trusted domains
 */
export function validateRedirectUrl(url: string, allowedHosts?: string[]): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Redirect URL is required' };
  }
  
  try {
    const parsed = new URL(url, 'http://localhost');
    
    // Only allow relative URLs or same-host redirects
    if (url.startsWith('/')) {
      return { valid: true };
    }
    
    // Check against allowed hosts if provided
    if (allowedHosts && allowedHosts.includes(parsed.hostname)) {
      return { valid: true };
    }
    
    // Disallow protocol-relative and external URLs by default
    return { valid: false, error: 'Invalid redirect URL' };
  } catch (e) {
    return { valid: false, error: 'Invalid redirect URL format' };
  }
}

/**
 * Check rate limit for authentication attempts
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { attempts: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  record.attempts += 1;
  const allowed = record.attempts <= MAX_ATTEMPTS;
  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  
  if (!allowed) {
    // Clean up to prevent memory leak
    if (now > record.resetTime + RATE_LIMIT_WINDOW * 2) {
      rateLimitStore.delete(identifier);
    }
  }
  
  return { allowed, remaining, resetTime: record.resetTime };
}

/**
 * Generate CSRF token for forms
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token (in production, compare against session store)
 */
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false;
  }
  
  try {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  } catch (e) {
    return false;
  }
}

/**
 * Validate channel parameter: alphanumeric, no path traversal
 */
export function validateChannel(channel: string): { valid: boolean; error?: string } {
  if (!channel || typeof channel !== 'string') {
    return { valid: false, error: 'Channel is required' };
  }
  
  const trimmed = channel.trim();
  
  // Prevent path traversal
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'Invalid channel format' };
  }
  
  // Allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid channel format' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Channel name too long' };
  }
  
  return { valid: true };
}

/**
 * Sanitize search/filter input to prevent injection
 */
export function sanitizeSearchInput(input: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Search input too long' };
  }
  
  // Remove dangerous characters and patterns
  const sanitized = trimmed
    .replace(/[<>"'`]/g, '') // Remove HTML/JavaScript tags
    .replace(/[;\\]/g, ''); // Remove SQL/injection chars
  
  return { valid: true, sanitized };
}
