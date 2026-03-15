/**
 * Centralized input validation with injection prevention
 * All user inputs must pass through these validators before use
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Security pattern detection
const XSS_DANGEROUS_CHARS = /[<>"'`]/g;
const SQL_INJECTION_CHARS = /[';"\\]/g;
const COMMAND_INJECTION_CHARS = /[&|;`$(){}\[\]<>]/g;
const PATH_TRAVERSAL_CHARS = /\.\.\//g;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 500;

/**
 * Detect injection patterns in input strings
 * Returns true if dangerous patterns found
 */
const hasInjectionPatterns = (input: string): boolean => {
  return XSS_DANGEROUS_CHARS.test(input) || 
         SQL_INJECTION_CHARS.test(input) || 
         COMMAND_INJECTION_CHARS.test(input);
};

/**
 * Sanitize password: remove leading/trailing whitespace only
 * Do NOT strip from middle - user may intend spaces
 */
const sanitizePassword = (password: string): string => {
  return password.trim();
};

/**
 * Validate email address format
 */
export const validateEmail = (email: unknown): email is string => {
  if (typeof email !== 'string') return false;
  if (email.length === 0 || email.length > 254) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  if (hasInjectionPatterns(email)) return false;
  return true;
};

/**
 * Validate password strength and security
 */
export const validatePassword = (password: unknown): password is string => {
  if (typeof password !== 'string') return false;
  const sanitized = sanitizePassword(password);
  if (hasInjectionPatterns(password)) return false;
  if (sanitized.length < PASSWORD_MIN_LENGTH || sanitized.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  return true;
};

/**
 * Validate reset/session tokens
 * Tokens should be alphanumeric plus standard separators
 */
export const validateToken = (token: unknown): token is string => {
  if (typeof token !== 'string') return false;
  if (token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) return false;
  // Tokens should only contain alphanumeric, dots, hyphens, underscores (JWT format)
  if (!/^[A-Za-z0-9._-]+$/.test(token)) return false;
  return true;
};

/**
 * Validate reset token with detailed errors
 */
export function validateResetToken(token: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (typeof token !== 'string') {
    errors.push({ field: 'token', message: 'Token must be a string' });
    return { valid: false, errors };
  }
  
  if (token.length === 0) {
    errors.push({ field: 'token', message: 'Token cannot be empty' });
  }
  
  if (token.length > TOKEN_MAX_LENGTH) {
    errors.push({ field: 'token', message: `Token exceeds maximum length of ${TOKEN_MAX_LENGTH}` });
  }
  
  if (!/^[A-Za-z0-9._-]+$/.test(token)) {
    errors.push({ field: 'token', message: 'Token contains invalid characters' });
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate new password with confirmation
 */
export function validatePasswordChange(
  newPassword: unknown,
  confirmPassword: unknown
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (typeof newPassword !== 'string') {
    errors.push({ field: 'newPassword', message: 'Password must be a string' });
  } else if (!validatePassword(newPassword)) {
    errors.push({ 
      field: 'newPassword', 
      message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` 
    });
  }
  
  if (typeof confirmPassword !== 'string') {
    errors.push({ field: 'confirmPassword', message: 'Confirmation must be a string' });
  }
  
  if (newPassword !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate registration/login input
 */
export function validateAuthCredentials(
  email: unknown,
  password: unknown
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email address' });
  }
  
  if (!validatePassword(password)) {
    errors.push({ 
      field: 'password', 
      message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` 
    });
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize user input for safe display (XSS prevention)
 */
export const sanitizeForDisplay = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validate URL slug (no path traversal)
 */
export const validateSlug = (slug: unknown): slug is string => {
  if (typeof slug !== 'string') return false;
  if (slug.length === 0 || slug.length > 255) return false;
  if (PATH_TRAVERSAL_CHARS.test(slug)) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  return true;
};
