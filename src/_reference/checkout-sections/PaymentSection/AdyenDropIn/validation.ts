import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const attemptMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Validate email format and structure
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required and must be a string" };
  }
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  if (trimmed.length > 254) {
    return { valid: false, error: "Email exceeds maximum length" };
  }
  
  return { valid: true };
}

/**
 * Validate password strength and encoding
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required and must be a string" };
  }
  
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  
  if (password.length > 256) {
    return { valid: false, error: "Password exceeds maximum length" };
  }
  
  // Prevent non-UTF8 or control characters
  const utf8Encoded = Buffer.from(password, "utf8").toString("utf8");
  if (utf8Encoded !== password) {
    return { valid: false, error: "Password contains invalid characters" };
  }
  
  return { valid: true };
}

/**
 * Validate and sanitize redirect URL
 */
export function validateRedirectUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Redirect URL is required" };
  }
  
  try {
    const parsed = new URL(url);
    // Only allow https and http protocols
    if (!parsed.protocol.startsWith("http")) {
      return { valid: false, error: "Invalid redirect URL protocol" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid redirect URL format" };
  }
}

/**
 * Check rate limit for authentication attempts
 */
export function checkRateLimit(identifier: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const record = attemptMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    attemptMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    const waitTime = Math.ceil((record.resetTime - now) / 1000 / 60);
    return { allowed: false, error: `Too many attempts. Please try again in ${waitTime} minutes.` };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * Generate CSRF token for session validation
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate CSRF token matches expected value
 */
export function validateCSRFToken(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
