/**
 * Payment error message mapping with security hardening.
 * Ensures sensitive information (transaction IDs, card details, backend traces) is NOT exposed to users.
 * All errors are mapped to generic user-friendly messages.
 */

import { PaymentErrorCode } from "./types";

interface ErrorMapping {
  userMessage: string; // Safe message for user display
  logMessage?: string; // Internal logging context (never shown to user)
}

const ERROR_MESSAGES: Record<PaymentErrorCode | string, ErrorMapping> = {
  // Validation errors
  INVALID_CARD_NUMBER: {
    userMessage: "Please enter a valid card number",
    logMessage: "Card validation failed",
  },
  INVALID_EXPIRY_DATE: {
    userMessage: "Please enter a valid expiration date",
    logMessage: "Expiry date validation failed",
  },
  INVALID_CVC: {
    userMessage: "Please enter a valid security code",
    logMessage: "CVC validation failed",
  },

  // Payment gateway errors - NEVER expose transaction IDs
  PAYMENT_DECLINED: {
    userMessage: "Your payment was declined. Please try another payment method.",
    logMessage: "Payment declined by gateway",
  },
  PAYMENT_FAILED: {
    userMessage: "Payment processing failed. Please try again or contact support.",
    logMessage: "Payment processing error",
  },
  PAYMENT_CANCELLED: {
    userMessage: "Payment was cancelled. No charges were made.",
    logMessage: "User cancelled payment",
  },

  // Network/system errors - generic without technical details
  NETWORK_ERROR: {
    userMessage: "Connection error. Please check your internet and try again.",
    logMessage: "Network connectivity issue",
  },
  TIMEOUT: {
    userMessage: "Payment request timed out. Please try again.",
    logMessage: "Request timeout",
  },
  SERVER_ERROR: {
    userMessage: "We encountered an issue processing your payment. Please try again or contact support.",
    logMessage: "Backend service error",
  },

  // Session errors - no session identifiers exposed
  SESSION_EXPIRED: {
    userMessage: "Your session has expired. Please start over.",
    logMessage: "Session token invalid or expired",
  },
  SESSION_NOT_FOUND: {
    userMessage: "Unable to retrieve payment session. Please start over.",
    logMessage: "Session ID not found",
  },

  // Authentication errors - no credential hints
  UNAUTHORIZED: {
    userMessage: "Authentication failed. Please try again or contact support.",
    logMessage: "API authentication failed",
  },
  FORBIDDEN: {
    userMessage: "You do not have permission to complete this transaction.",
    logMessage: "Authorization check failed",
  },

  // Generic fallback - NEVER include error details
  UNKNOWN_ERROR: {
    userMessage: "An error occurred during payment. Please try again or contact support.",
    logMessage: "Unhandled error",
  },
};

/**
 * Get safe user-facing error message
 * CRITICAL: Always returns generic message, never raw error details
 */
export function getUserFacingErrorMessage(errorCode: PaymentErrorCode | string): string {
  const mapping = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
  return mapping.userMessage;
}

/**
 * Get internal logging context (for server-side logs only)
 * CRITICAL: This should NEVER be sent to client
 */
export function getInternalErrorContext(
  errorCode: PaymentErrorCode | string,
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  const mapping = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
  return {
    code: errorCode,
    message: mapping.logMessage,
    ...additionalContext,
    // NOTE: If you need to log transaction ID or backend error,
    // ensure it goes to secure server-side logging, never to client
  };
}

/**
 * Safely handle Adyen error response
 * Sanitizes any raw error data before using it
 */
export function handleAdyenError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return getUserFacingErrorMessage('UNKNOWN_ERROR');
  }

  // Extract error code if present, but validate it
  const errorObj = error as Record<string, unknown>;
  const errorCode = typeof errorObj.code === 'string' ? errorObj.code : 'UNKNOWN_ERROR';

  // Log for debugging (server-side only)
  if (typeof console !== 'undefined') {
    console.error('[Payment Error]', getInternalErrorContext(errorCode, { rawError: error }));
  }

  return getUserFacingErrorMessage(errorCode);
}

/**
 * Map HTTP status codes to safe error messages
 * Prevents information disclosure from HTTP errors
 */
export function mapHttpStatusToErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return getUserFacingErrorMessage('PAYMENT_FAILED');
    case 401:
    case 403:
      return getUserFacingErrorMessage('UNAUTHORIZED');
    case 404:
      return getUserFacingErrorMessage('SESSION_NOT_FOUND');
    case 408:
    case 504:
      return getUserFacingErrorMessage('TIMEOUT');
    case 500:
    case 502:
    case 503:
      return getUserFacingErrorMessage('SERVER_ERROR');
    default:
      return getUserFacingErrorMessage('UNKNOWN_ERROR');
  }
}
