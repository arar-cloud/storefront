/**
 * API Security utilities for request validation and sanitization
 * SECURITY REVIEW: api-request-validation
 */

/**
 * Validate HTTP method is one of allowed values
 * Prevents method confusion attacks
 */
export const isValidHttpMethod = (
  method: string | undefined,
  allowed: string[] = ['POST', 'GET', 'PUT', 'DELETE']
): boolean => {
  return method ? allowed.includes(method.toUpperCase()) : false;
};

/**
 * Validate Content-Type header
 * SECURITY: Prevent content-type confusion attacks
 */
export const isValidContentType = (
  contentType: string | undefined,
  expected: string[] = ['application/json']
): boolean => {
  if (!contentType) return false;
  
  // Check for header injection (CRLF)
  if (/[\r\n]/g.test(contentType)) return false;
  
  // Extract base content type without charset
  const baseType = contentType.split(';')[0].trim();
  return expected.includes(baseType);
};

/**
 * Sanitize request headers to prevent injection
 * Removes CRLF and null bytes from header values
 */
export const sanitizeHeaders = (
  headers: Record<string, string | undefined>
): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    
    // Remove control chars, CRLF, null bytes
    const clean = value
      .replace(/[\r\n\x00]/g, '')
      .trim()
      .slice(0, 1024); // Max header value length
    
    if (clean) {
      sanitized[key.toLowerCase()] = clean;
    }
  }
  
  return sanitized;
};

/**
 * Validate request body is JSON object
 * SECURITY: Prevent prototype pollution attacks via object parsing
 */
export const validateJsonBody = (body: unknown): { valid: boolean; data?: Record<string, unknown> } => {
  if (!body) {
    return { valid: false };
  }
  
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false };
  }
  
  // Check for prototype pollution attempts
  const obj = body as Record<string, unknown>;
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  for (const key of dangerousKeys) {
    if (key in obj) {
      return { valid: false }; // Reject suspicious keys
    }
  }
  
  return { valid: true, data: obj };
};

/**
 * Rate limit key generator from request
 * Returns a key for tracking API request rates per user/IP
 */
export const getRateLimitKey = (
  identifier: string,
  endpoint: string
): string => {
  // Sanitize identifier (remove CRLF)
  const clean = identifier.replace(/[\r\n]/g, '');
  return `${endpoint}:${clean}`;
};
