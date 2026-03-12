/**
 * Auth input validation schemas.
 * Centralized validation for all authentication endpoints.
 * SECURITY: All validation functions return detailed errors for logging but generic messages for clients.
 * @security-review input-validation-auth
 */

// RFC 5321 compliant email validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 255;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,}$/; // Enforce 20+ chars for tokens
// Security: Strict XSS/Injection prevention patterns
const XSS_DANGEROUS_CHARS = /<[^>]*>|javascript:|data:|vbscript:|onerror=|onload=|onclick=|eval\(|expression\(/gi;
const SQL_INJECTION_CHARS = /[';"\\]/g;
const COMMAND_INJECTION_CHARS = /[&|;`$(){}\[\]<>\\]/g;
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

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
  const sanitized = sanitizePassword(password);
  if (hasInjectionPatterns(password)) return false;
  if (sanitized.length < PASSWORD_MIN_LENGTH || sanitized.length > PASSWORD_MAX_LENGTH) return false;
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

  if (!email || typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required and must be a string' });
  } else {
    const sanitized = sanitizeEmail(email);
    if (hasInjectionPatterns(email)) {
      errors.push({ field: 'email', message: 'Email contains invalid characters' });
    } else if (!EMAIL_REGEX.test(sanitized)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }
  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required and must be a string' });
  } else {
    const sanitized = sanitizePassword(password);
    if (hasInjectionPatterns(password)) {
      errors.push({ field: 'password', message: 'Password contains invalid characters' });
    } else if (sanitized.length < PASSWORD_MIN_LENGTH) {
      errors.push({ field: 'password', message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    } else if (sanitized.length > PASSWORD_MAX_LENGTH) {
      errors.push({ field: 'password', message: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters` });
    }
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
/**
 * Sanitize email input: remove control chars, trim, lowercase
 */
const sanitizeEmail = (email: string): string => {
  return email
    .trim()
    .toLowerCase()
    .replace(CONTROL_CHARS, '')
    .slice(0, 254); // RFC 5321 max email length
};

/**
 * Sanitize password input: remove null bytes and control chars
 */
const sanitizePassword = (password: string): string => {
  return password.replace(CONTROL_CHARS, '').slice(0, PASSWORD_MAX_LENGTH);
};

/**
 * Check if input contains injection patterns
 */
const hasInjectionPatterns = (input: string): boolean => {
  return XSS_DANGEROUS_CHARS.test(input) || 
         SQL_INJECTION_CHARS.test(input) || 
         COMMAND_INJECTION_CHARS.test(input);
};

/**
 * Validate Authorization header format and token
 * SECURITY: Strict token format validation to prevent header injection
 */
export const validateAuthHeader = (authHeader: string | undefined): AuthValidationError[] => {
  const errors: AuthValidationError[] = [];
  
  if (!authHeader) {
    errors.push({ field: 'authorization', message: 'Authorization header is required' });
    return errors;
  }
  
  // Check for header injection attempts (CRLF)
  if (/[\r\n]/g.test(authHeader)) {
    errors.push({ field: 'authorization', message: 'Invalid authorization header format' });
    return errors;
  }
  
  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' && scheme !== 'bearer') {
    errors.push({ field: 'authorization', message: 'Only Bearer tokens are supported' });
  }
  
  if (!token || !TOKEN_PATTERN.test(token)) {
    errors.push({ field: 'authorization', message: 'Invalid token format' });
  }
  
  return errors;
};

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
