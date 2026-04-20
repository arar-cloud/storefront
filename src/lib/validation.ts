/**
 * Centralized input validation and sanitization for GraphQL mutations.
 * All user inputs must pass through these validators before being sent to resolvers.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
const SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-',.\/&()]+$/;

interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Sanitize string input - trim whitespace and remove potentially harmful characters
 */
export function sanitizeString(input: unknown, maxLength = 255, pattern?: RegExp): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  let sanitized = input.trim().slice(0, maxLength);
  
  // Remove any HTML/script tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // If pattern provided, validate against it
  if (pattern && !pattern.test(sanitized)) {
    throw new Error(`Input does not match required pattern`);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: unknown): ValidationResult<string> {
  try {
    if (typeof email !== 'string') {
      return { valid: false, errors: [{ field: 'email', message: 'Email must be a string' }] };
    }
    
    const sanitized = sanitizeString(email, 254);
    
    if (!EMAIL_REGEX.test(sanitized)) {
      return { valid: false, errors: [{ field: 'email', message: 'Invalid email format' }] };
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, errors: [{ field: 'email', message: String(error) }] };
  }
}

/**
 * Validate and sanitize password
 * Requirements: minimum 8 chars, at least one uppercase, one lowercase, one number
 */
export function validatePassword(password: unknown): ValidationResult<string> {
  try {
    if (typeof password !== 'string') {
      return { valid: false, errors: [{ field: 'password', message: 'Password must be a string' }] };
    }
    
    if (password.length < 8) {
      return { valid: false, errors: [{ field: 'password', message: 'Password must be at least 8 characters' }] };
    }
    
    if (password.length > 128) {
      return { valid: false, errors: [{ field: 'password', message: 'Password is too long' }] };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, errors: [{ field: 'password', message: 'Password must contain uppercase letter' }] };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, errors: [{ field: 'password', message: 'Password must contain lowercase letter' }] };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, errors: [{ field: 'password', message: 'Password must contain number' }] };
    }
    
    return { valid: true, data: password };
  } catch (error) {
    return { valid: false, errors: [{ field: 'password', message: String(error) }] };
  }
}

/**
 * Validate and sanitize person name (first name, last name, etc.)
 */
export function validateName(name: unknown, fieldName = 'name'): ValidationResult<string> {
  try {
    if (typeof name !== 'string') {
      return { valid: false, errors: [{ field: fieldName, message: 'Name must be a string' }] };
    }
    
    const sanitized = sanitizeString(name, 50);
    
    if (sanitized.length < 1) {
      return { valid: false, errors: [{ field: fieldName, message: 'Name cannot be empty' }] };
    }
    
    // Allow letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
      return { valid: false, errors: [{ field: fieldName, message: 'Name contains invalid characters' }] };
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, errors: [{ field: fieldName, message: String(error) }] };
  }
}

/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone: unknown): ValidationResult<string> {
  try {
    if (typeof phone !== 'string') {
      return { valid: false, errors: [{ field: 'phone', message: 'Phone must be a string' }] };
    }
    
    const sanitized = sanitizeString(phone, 20);
    
    if (!PHONE_REGEX.test(sanitized)) {
      return { valid: false, errors: [{ field: 'phone', message: 'Invalid phone number format' }] };
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, errors: [{ field: 'phone', message: String(error) }] };
  }
}

/**
 * Validate address field (street, city, etc.)
 */
export function validateAddressField(value: unknown, fieldName = 'address'): ValidationResult<string> {
  try {
    if (typeof value !== 'string') {
      return { valid: false, errors: [{ field: fieldName, message: 'Address field must be a string' }] };
    }
    
    const sanitized = sanitizeString(value, 100);
    
    if (sanitized.length < 1) {
      return { valid: false, errors: [{ field: fieldName, message: 'Address field cannot be empty' }] };
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, errors: [{ field: fieldName, message: String(error) }] };
  }
}

/**
 * Validate postal code (accepts formats from multiple countries)
 */
export function validatePostalCode(code: unknown): ValidationResult<string> {
  try {
    if (typeof code !== 'string') {
      return { valid: false, errors: [{ field: 'postalCode', message: 'Postal code must be a string' }] };
    }
    
    const sanitized = sanitizeString(code, 20);
    
    if (!/^[a-zA-Z0-9\s\-]+$/.test(sanitized)) {
      return { valid: false, errors: [{ field: 'postalCode', message: 'Postal code contains invalid characters' }] };
    }
    
    if (sanitized.length < 2) {
      return { valid: false, errors: [{ field: 'postalCode', message: 'Postal code is too short' }] };
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, errors: [{ field: 'postalCode', message: String(error) }] };
  }
}

/**
 * Batch validate user registration input
 */
export function validateRegistrationInput(input: unknown): ValidationResult<{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}> {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: [{ field: 'input', message: 'Input must be an object' }] };
  }
  
  const obj = input as Record<string, unknown>;
  const errors: ValidationError[] = [];
  
  const emailResult = validateEmail(obj.email);
  if (!emailResult.valid) {
    errors.push(...(emailResult.errors || []));
  }
  
  const passwordResult = validatePassword(obj.password);
  if (!passwordResult.valid) {
    errors.push(...(passwordResult.errors || []));
  }
  
  const firstNameResult = validateName(obj.firstName, 'firstName');
  if (!firstNameResult.valid) {
    errors.push(...(firstNameResult.errors || []));
  }
  
  const lastNameResult = validateName(obj.lastName, 'lastName');
  if (!lastNameResult.valid) {
    errors.push(...(lastNameResult.errors || []));
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      email: emailResult.data!,
      password: passwordResult.data!,
      firstName: firstNameResult.data!,
      lastName: lastNameResult.data!,
    },
  };
}

/**
 * Validate reset password token and new password
 */
export function validateResetPasswordInput(input: unknown): ValidationResult<{
  token: string;
  password: string;
}> {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: [{ field: 'input', message: 'Input must be an object' }] };
  }
  
  const obj = input as Record<string, unknown>;
  const errors: ValidationError[] = [];
  
  if (typeof obj.token !== 'string' || obj.token.length === 0) {
    errors.push({ field: 'token', message: 'Token is required and must be a non-empty string' });
  }
  
  // Validate token format (must be a safe string)
  if (typeof obj.token === 'string' && !/^[a-zA-Z0-9_-]+$/.test(obj.token)) {
    errors.push({ field: 'token', message: 'Token has invalid format' });
  }
  
  const passwordResult = validatePassword(obj.password);
  if (!passwordResult.valid) {
    errors.push(...(passwordResult.errors || []));
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      token: obj.token as string,
      password: passwordResult.data!,
    },
  };
}
