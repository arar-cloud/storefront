/**
 * Input Sanitization Utilities for Auth Routes
 * Prevents XSS, injection attacks, and other input-based vulnerabilities
 */

/**
 * Sanitize string input - remove/escape potentially dangerous characters
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  
  // Trim and truncate
  let sanitized = input.trim().substring(0, maxLength);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  
  // Remove control characters (except newlines in specific contexts)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Email must be a string");
  }
  
  const email = sanitizeString(input, 254).toLowerCase();
  
  // Validate email format (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
  
  return email;
}

/**
 * Validate and sanitize password
 * Note: Should be validated but NOT sanitized (users may intentionally use special chars)
 */
export function validatePassword(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Password must be a string");
  }
  
  if (input.length < 8 || input.length > 128) {
    throw new Error("Password must be between 8 and 128 characters");
  }
  
  return input;
}

/**
 * Validate channel identifier
 */
export function sanitizeChannel(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Channel must be a string");
  }
  
  const channel = sanitizeString(input, 50);
  
  // Channel should be alphanumeric with hyphens/underscores only
  if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
    throw new Error("Invalid channel format");
  }
  
  return channel;
}

/**
 * Validate redirect URL
 */
export function validateRedirectUrl(url: unknown, allowedDomains: string[] = []): string {
  if (typeof url !== "string") {
    throw new Error("URL must be a string");
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are allowed");
    }
    
    // Check domain whitelist
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(
        domain => parsed.hostname === domain || parsed.hostname.endsWith("." + domain)
      );
      
      if (!isAllowed) {
        throw new Error("URL domain not in whitelist");
      }
    }
    
    return parsed.toString();
  } catch (error) {
    throw new Error("Invalid URL: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Batch validate request body
 */
export function sanitizeRequestBody<T>(
  body: unknown,
  schema: Record<string, (value: unknown) => string>
): T {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be an object");
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, sanitizer] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[key];
    
    try {
      sanitized[key] = sanitizer(value);
    } catch (error) {
      throw new Error(
        `Field '${key}' validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  
  return sanitized as T;
}
