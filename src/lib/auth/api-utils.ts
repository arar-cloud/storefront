/**
 * Auth API utilities for request validation and error handling.
 */

import type { NextResponse } from 'next/server';
import type { AuthValidationError } from './validation';

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: AuthValidationError[];
}

/**
 * Create a standardized error response.
 */
export const createErrorResponse = (
  error: string,
  status: number = 400,
  code?: string,
  details?: AuthValidationError[]
): { status: number; body: ApiErrorResponse } => {
  return {
    status,
    body: {
      error,
      ...(code && { code }),
      ...(details && details.length > 0 && { details }),
    },
  };
};

/**
 * Safely parse JSON request body with size limit.
 */
export const parseRequestBody = async (request: Request): Promise<unknown> => {
  try {
    // Limit request body size to 1MB to prevent DOS
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      throw new Error('Request body too large');
    }

    const text = await request.text();
    // Additional size check on parsed content
    if (text.length > 1024 * 1024) {
      throw new Error('Request body too large');
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body');
    }
    throw error;
  }
};

/**
 * Create a JSON response with proper headers.
 */
export const createJsonResponse = (
  data: unknown,
  status: number = 200
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  });
};

/**
 * Rate limiting helper (simple in-memory for now, should be upgraded to Redis).
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new window
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
};
