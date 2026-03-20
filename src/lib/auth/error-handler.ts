// Security: Standardized error responses to prevent information disclosure
// Never expose internal error details, tokens, or validation patterns to clients

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public isPublic: boolean = false
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Safe error response for API clients
 * Security: Only includes user-facing messages, never internal details
 */
export function createSafeErrorResponse(error: unknown) {
  let message = "An authentication error occurred";
  let code = "AUTH_ERROR";
  let statusCode = 400;

  if (error instanceof AuthError) {
    statusCode = error.statusCode;
    code = error.code;
    // Only include error message if explicitly marked as public
    if (error.isPublic) {
      message = error.message;
    }
  } else if (error instanceof Error) {
    // Security: Log internal error for debugging, but don't expose to client
    console.error("[Auth Internal Error]", error.message);
  }

  return {
    error: {
      code,
      message,
    },
    statusCode,
  };
}

/**
 * Common auth error codes with safe messages
 */
export const AUTH_ERRORS = {
  INVALID_EMAIL: new AuthError(
    "Invalid email format",
    "INVALID_EMAIL",
    400,
    true
  ),
  INVALID_PASSWORD: new AuthError(
    "Password does not meet security requirements",
    "INVALID_PASSWORD",
    400,
    true
  ),
  PASSWORD_MISMATCH: new AuthError(
    "Passwords do not match",
    "PASSWORD_MISMATCH",
    400,
    true
  ),
  INVALID_TOKEN: new AuthError(
    "Invalid or expired reset token",
    "INVALID_TOKEN",
    400,
    true
  ),
  EMAIL_EXISTS: new AuthError(
    "This email is already registered",
    "EMAIL_EXISTS",
    409,
    true
  ),
  USER_NOT_FOUND: new AuthError(
    "No account found with this email",
    "USER_NOT_FOUND",
    404,
    true
  ),
  UNAUTHORIZED: new AuthError(
    "Unauthorized request",
    "UNAUTHORIZED",
    401,
    true
  ),
  INVALID_REQUEST: new AuthError(
    "Invalid request format",
    "INVALID_REQUEST",
    400,
    true
  ),
};
