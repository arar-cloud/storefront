/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{isValid: boolean; errors: string[]}} Validation result with errors
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Validate before processing
  if (input.length === 0) return '';
  if (input.length > 5000) {
    throw new Error('Input exceeds maximum length');
  }
  
  return input
    .trim()
    .replace(/[<>"'`]/g, (char) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
      };
      return escapeMap[char] || char;
    })
    .slice(0, 500); // Limit length
}

/**
 * Validate POST request body structure
 * @param {unknown} body - Request body to validate
 * @param {string[]} requiredFields - Required field names
 * @returns {{isValid: boolean; missingFields: string[]}} Validation result
 */
export function validateRequestBody(
  body: unknown,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      missingFields: requiredFields,
    };
  }
  
  const bodyObj = body as Record<string, unknown>;
  const missingFields = requiredFields.filter((field) => !bodyObj[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
