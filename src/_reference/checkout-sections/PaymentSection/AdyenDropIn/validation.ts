/**
 * Input validation and sanitization for Adyen payment integration.
 * Ensures all external data (API responses, UI inputs) are validated before processing.
 */

import { z } from 'zod';

/**
 * Sanitize string to prevent XSS - removes suspicious patterns
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Expected string value');
  }
  // Only allow alphanumeric, hyphens, underscores, dots, and @ for email
  // Remove any potentially harmful characters
  return value.replace(/[^a-zA-Z0-9\-_.@]/g, '').substring(0, 255);
}

/**
 * Validate Adyen checkout response structure
 */
const AdyenCheckoutResponseSchema = z.object({
  sessionId: z.string().uuid().optional(),
  id: z.string().min(1).max(255),
  amount: z.object({
    value: z.number().int().positive(),
    currency: z.string().length(3).toUpperCase(),
  }),
  reference: z.string().min(1).max(80), // Adyen reference ID
  returnUrl: z.string().url().optional(),
  // Strictly allow only expected payment app data
  paymentMethods: z.object({}).strict().optional(),
  // Do NOT include raw errorMessages - validate separately
});

export type ValidatedAdyenCheckout = z.infer<typeof AdyenCheckoutResponseSchema>;

/**
 * Validate Adyen API response
 * @throws {Error} if validation fails
 */
export function validateAdyenCheckoutResponse(data: unknown): ValidatedAdyenCheckout {
  return AdyenCheckoutResponseSchema.parse(data);
}

/**
 * Validate session ID format - prevents session fixation
 */
const SessionIdSchema = z.string().uuid('Invalid session format');

export function validateSessionId(sessionId: unknown): string {
  return SessionIdSchema.parse(sessionId);
}

/**
 * Validate CSRF token presence and format
 */
const CSRFTokenSchema = z.string().min(32).max(512);

export function validateCSRFToken(token: unknown): string {
  return CSRFTokenSchema.parse(token);
}

/**
 * Validate order ID - prevent injection
 */
export function validateOrderId(orderId: unknown): string {
  if (typeof orderId !== 'string') {
    throw new Error('Order ID must be a string');
  }
  const sanitized = sanitizeString(orderId);
  if (sanitized.length === 0) {
    throw new Error('Invalid order ID format');
  }
  return sanitized;
}

/**
 * Validate email address
 */
const EmailSchema = z.string().email().max(255);

export function validateEmail(email: unknown): string {
  return EmailSchema.parse(email);
}
