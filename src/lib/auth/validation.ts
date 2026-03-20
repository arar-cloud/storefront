// Security: Input validation schema for authentication endpoints
// Prevents injection attacks, XSS, and malformed requests

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 255;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ResetPasswordInput {
  email: string;
}

export interface SetPasswordInput {
  token: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Validate email format and length
 * Security: Reject emails with suspicious patterns
 */
export function validateEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  if (email.length === 0 || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength and length
 * Security: Enforce minimum length, reject common weak patterns
 */
export function validatePassword(password: unknown): password is string {
  if (typeof password !== "string") return false;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  // Reject passwords that are just repeated characters (weak entropy)
  if (/^(.)\1+$/.test(password)) return false;
  return true;
}

/**
 * Validate optional name fields
 * Security: Limit length to prevent buffer overflow or DoS
 */
export function validateNameField(name: unknown): name is string {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > NAME_MAX_LENGTH) return false;
  // Reject names with suspicious control characters
  if (/[\x00-\x1f\x7f]/.test(name)) return false;
  return true;
}

/**
 * Validate reset/set-password token format
 * Security: Ensure token matches expected format before processing
 */
export function validateToken(token: unknown): token is string {
  if (typeof token !== "string") return false;
  if (token.length < 10 || token.length > 1000) return false;
  // Allow base64-like tokens with common formats
  return /^[a-zA-Z0-9_\-\.]+$/.test(token);
}

/**
 * Validate register request body
 */
export function validateRegisterInput(data: unknown): data is RegisterInput {
  if (typeof data !== "object" || data === null) return false;
  const input = data as Record<string, unknown>;

  // Required fields
  if (!validateEmail(input.email)) return false;
  if (!validatePassword(input.password)) return false;

  // Optional fields
  if (input.firstName !== undefined && !validateNameField(input.firstName)) return false;
  if (input.lastName !== undefined && !validateNameField(input.lastName)) return false;

  return true;
}

/**
 * Validate reset password request body
 */
export function validateResetPasswordInput(data: unknown): data is ResetPasswordInput {
  if (typeof data !== "object" || data === null) return false;
  const input = data as Record<string, unknown>;
  return validateEmail(input.email);
}

/**
 * Validate set password request body
 */
export function validateSetPasswordInput(data: unknown): data is SetPasswordInput {
  if (typeof data !== "object" || data === null) return false;
  const input = data as Record<string, unknown>;

  if (!validateToken(input.token)) return false;
  if (!validatePassword(input.password)) return false;
  if (typeof input.passwordConfirm !== "string") return false;

  // Ensure passwords match
  if (input.password !== input.passwordConfirm) return false;

  return true;
}
