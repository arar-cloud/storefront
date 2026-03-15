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
 * Validate form data with injection prevention
 * Checks for prototype pollution and dangerous patterns
 */
export function validateFormData(data: Record<string, unknown>): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (typeof data !== 'object' || data === null) {
    errors.push({ field: 'data', message: 'Input must be an object' });
    return { valid: false, errors };
  }
  
  // Prevent prototype pollution attacks
  if ('__proto__' in data || 'constructor' in data || 'prototype' in data) {
    errors.push({ field: 'data', message: 'Invalid data structure: prototype pollution detected' });
    return { valid: false, errors };
  }
  
  // Validate all string values for injection patterns
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && hasInjectionPatterns(value)) {
      errors.push({ field: key, message: `Field contains potentially dangerous patterns` });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

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

/**
 * Validate URL format and prevent SSRF attacks
 */
export const validateUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Prevent localhost/internal IP access
    const hostname = parsed.hostname;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) return false;
    if (hostname.match(/^192\.168|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./)) return false;
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate file path to prevent directory traversal
 */
export const validateFilePath = (filePath: unknown): filePath is string => {
  if (typeof filePath !== 'string') return false;
  if (filePath.length === 0 || filePath.length > 512) return false;
  if (PATH_TRAVERSAL_CHARS.test(filePath)) return false;
  if (/[<>:"|?*\x00]/.test(filePath)) return false;
  if (filePath.startsWith('/')) return false;
  return true;
};
