/**
 * Auth input validation schemas.
 * Centralized validation for all authentication endpoints.
 * SECURITY: All validation functions return detailed errors for logging but generic messages for clients.
 * @security-review input-validation-auth
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/; // JWT-like format
// Security: XSS/Injection prevention patterns
const XSS_DANGEROUS_CHARS = /<[^>]*>|javascript:|data:|vbscript:|onerror=|onload=|onclick=/gi;
const SQL_INJECTION_CHARS = /['"`;\\]/g;
const COMMAND_INJECTION_CHARS = /[&|;/**
 * Auth input validation schemas.
 * Centralized validation for all authentication endpoints.
 */

(){}\[\]<>]/g;

export interface AuthValidationError {
  field: string;
  message: string;
  internal?: boolean; // If true, message is for logging only, use generic message for client
}

/**
 * Sanitize string input to prevent XSS and injection attacks.
 * @security-review xss-prevention
 */
const sanitizeInput = (input: string): boolean => {
  if (XSS_DANGEROUS_CHARS.test(input)) return false;
  return true;
};

/**
 * Validate email format and length.
 * @security-review email-validation
 */
/**
 * Validate email format and length.
 * @security-review email-validation
 */
export const validateEmail = (email: unknown): email is string => {
  if (typeof email !== 'string') return false;
  if (email.length < 3 || email.length > 254) return false;
  if (!sanitizeInput(email)) return false;
  return EMAIL_REGEX.test(email);
};

/**
 * Validate password strength.
 * - Minimum 8 characters
 * - Maximum 128 characters (prevent DOS via excessively long inputs)
 * - No null bytes or control characters
 * @security-review password-validation
 */
export const validatePassword = (password: unknown): password is string => {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return false;
  // Reject null bytes and control characters that could bypass further validation
  if (/[\x00-\x1F\x7F]/.test(password)) return false;
  if (!sanitizeInput(password)) return false; // XSS prevention
  return true;
};

/**
 * Validate token format (e.g., JWT refresh tokens).
 */
export const validateToken = (token: unknown): token is string => {
  if (typeof token !== 'string') return false;
  if (token.length < 10 || token.length > 2048) return false;
  // Only allow alphanumeric, hyphens, underscores (JWT-safe)
  return TOKEN_PATTERN.test(token);
};

/**
 * Validate channel parameter (prevent injection).
 */
export const validateChannel = (channel: unknown): channel is string => {
  if (typeof channel !== 'string') return false;
  if (channel.length < 1 || channel.length > 100) return false;
  // Only allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(channel);
};

/**
 * Collect all validation errors for a request body.
 */
export const validateAuthRegisterRequest = (body: unknown): AuthValidationError[] => {
  const errors: AuthValidationError[] = [];
  if (typeof body !== 'object' || body === null) {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return errors;
  }

  const { email, password, firstName, lastName, channel } = body as Record<string, unknown>;

  if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  if (!validatePassword(password)) {
    errors.push({ field: 'password', message: 'Password must be 8-128 characters' });
  }
  if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length > 100)) {
    errors.push({ field: 'firstName', message: 'First name must be a string under 100 characters' });
  }
  if (lastName !== undefined && (typeof lastName !== 'string' || lastName.length > 100)) {
    errors.push({ field: 'lastName', message: 'Last name must be a string under 100 characters' });
  }
  if (channel !== undefined && !validateChannel(channel)) {
    errors.push({ field: 'channel', message: 'Invalid channel format' });
  }

  return errors;
};

/**
 * Validate reset-password request.
 */
export const validateResetPasswordRequest = (body: unknown): AuthValidationError[] => {
  const errors: AuthValidationError[] = [];
  if (typeof body !== 'object' || body === null) {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return errors;
  }

  const { email, channel } = body as Record<string, unknown>;

  if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  if (channel !== undefined && !validateChannel(channel)) {
    errors.push({ field: 'channel', message: 'Invalid channel format' });
  }

  return errors;
};

/**
 * Validate set-password request.
 */
export const validateSetPasswordRequest = (body: unknown): AuthValidationError[] => {
  const errors: AuthValidationError[] = [];
  if (typeof body !== 'object' || body === null) {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return errors;
  }

  const { token, password, channel } = body as Record<string, unknown>;

  if (!validateToken(token)) {
    errors.push({ field: 'token', message: 'Invalid token format' });
  }
  if (!validatePassword(password)) {
    errors.push({ field: 'password', message: 'Password must be 8-128 characters' });
  }
  if (channel !== undefined && !validateChannel(channel)) {
    errors.push({ field: 'channel', message: 'Invalid channel format' });
  }

  return errors;
};
