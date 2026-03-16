import { NextRequest, NextResponse } from 'next/server';

/**
 * API middleware for security validation
 */

const MAX_BODY_SIZE = 1024 * 100; // 100 KB limit

/**
 * Validate incoming request: content-type, size, and JSON structure
 */
export const validateRequest = async (request: NextRequest) => {
  // Check content-type
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return {
      valid: false,
      error: { message: 'Invalid content-type. Expected application/json' },
      statusCode: 400,
    };
  }

  // Check body size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return {
      valid: false,
      error: { message: 'Request body exceeds maximum size' },
      statusCode: 413,
    };
  }

  // Attempt to parse JSON
  try {
    const body = await request.json();
    return { valid: true, body };
  } catch (err) {
    return {
      valid: false,
      error: { message: 'Invalid JSON in request body' },
      statusCode: 400,
    };
  }
};

/**
 * Check if request has valid origin header (CORS security)
 */
export const validateOrigin = (
  request: NextRequest,
  allowedOrigins: string[]
) => {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins.includes(origin)) {
    return { valid: false, message: 'Origin not allowed' };
  }
  return { valid: true };
};

/**
 * Sanitize string input: remove control characters and excessive whitespace
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, 1000); // Enforce max length
};
