/**
 * Payment form input validation and sanitization utilities.
 * Prevents malformed data and injection attacks from reaching backend services.
 */

const CARD_NUMBER_REGEX = /^\d{13,19}$/;
const CVV_REGEX = /^\d{3,4}$/;
const POSTAL_CODE_REGEX = /^[A-Z0-9]{3,10}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9\s\-()]+$/;
const XSS_DANGEROUS_CHARS = /<|>|["|'`]|javascript:|on\w+\s*=/i;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate and sanitize payment form input.
 */
export function validatePaymentInput(
  fieldName: string,
  value: any,
): ValidationResult {
  // Null/undefined check
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Convert to string and trim
  const stringValue = String(value).trim();

  // Check for dangerous content
  if (XSS_DANGEROUS_CHARS.test(stringValue)) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }

  // Field-specific validation
  switch (fieldName.toLowerCase()) {
    case 'cardnumber':
      return validateCardNumber(stringValue);
    case 'cvv':
    case 'cvc':
      return validateCVV(stringValue);
    case 'expirymonth':
      return validateExpiryMonth(stringValue);
    case 'expiryyear':
      return validateExpiryYear(stringValue);
    case 'cardholderName':
    case 'name':
      return validateCardholderName(stringValue);
    case 'email':
      return validateEmail(stringValue);
    case 'phone':
      return validatePhone(stringValue);
    case 'zipcode':
    case 'postalcode':
      return validatePostalCode(stringValue);
    case 'address':
    case 'street':
      return validateAddress(stringValue);
    case 'city':
    case 'country':
      return validateCityCountry(stringValue);
    default:
      return { valid: true, sanitized: sanitizeString(stringValue) };
  }
}

/**
 * Validate card number (Luhn algorithm check).
 */
function validateCardNumber(cardNumber: string): ValidationResult {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (!CARD_NUMBER_REGEX.test(cleaned)) {
    return { valid: false, error: 'Invalid card number format' };
  }

  // Luhn algorithm
  if (!luhnCheck(cleaned)) {
    return { valid: false, error: 'Invalid card number (failed checksum)' };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Luhn algorithm for card number validation.
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate CVV/CVC.
 */
function validateCVV(cvv: string): ValidationResult {
  const cleaned = cvv.replace(/\s/g, '');

  if (!CVV_REGEX.test(cleaned)) {
    return { valid: false, error: 'Invalid CVV format (must be 3-4 digits)' };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Validate expiry month.
 */
function validateExpiryMonth(month: string): ValidationResult {
  const cleaned = month.replace(/\s/g, '');
  const monthNum = parseInt(cleaned, 10);

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return { valid: false, error: 'Invalid month (must be 01-12)' };
  }

  return { valid: true, sanitized: monthNum.toString().padStart(2, '0') };
}

/**
 * Validate expiry year.
 */
function validateExpiryYear(year: string): ValidationResult {
  const cleaned = year.replace(/\s/g, '');
  const yearNum = parseInt(cleaned, 10);
  const currentYear = new Date().getFullYear();
  const twoDigitYear = currentYear % 100;

  let validYear = yearNum;
  if (yearNum < 100) {
    validYear = currentYear - twoDigitYear + yearNum;
  }

  if (validYear < currentYear) {
    return { valid: false, error: 'Card has expired' };
  }

  if (validYear > currentYear + 20) {
    return { valid: false, error: 'Invalid expiry year' };
  }

  return { valid: true, sanitized: validYear.toString() };
}

/**
 * Validate cardholder name.
 */
function validateCardholderName(name: string): ValidationResult {
  if (name.length < 2 || name.length > 50) {
    return { valid: false, error: 'Name must be 2-50 characters' };
  }

  // Allow letters, spaces, hyphens, and apostrophes only
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true, sanitized: sanitizeString(name) };
}

/**
 * Validate email address.
 */
function validateEmail(email: string): ValidationResult {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, sanitized: email.toLowerCase() };
}

/**
 * Validate phone number.
 */
function validatePhone(phone: string): ValidationResult {
  if (!PHONE_REGEX.test(phone)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  // Remove all non-digit characters for length check
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number must contain 7-15 digits' };
  }

  return { valid: true, sanitized: sanitizeString(phone) };
}

/**
 * Validate postal code.
 */
function validatePostalCode(postalCode: string): ValidationResult {
  if (postalCode.length < 3 || postalCode.length > 10) {
    return { valid: false, error: 'Invalid postal code length' };
  }

  if (!POSTAL_CODE_REGEX.test(postalCode)) {
    return { valid: false, error: 'Invalid postal code format' };
  }

  return { valid: true, sanitized: sanitizeString(postalCode) };
}

/**
 * Validate address.
 */
function validateAddress(address: string): ValidationResult {
  if (address.length < 3 || address.length > 100) {
    return { valid: false, error: 'Address must be 3-100 characters' };
  }

  // Allow alphanumeric, spaces, and common address characters
  if (!/^[a-zA-Z0-9\s.,#\-'/]+$/.test(address)) {
    return { valid: false, error: 'Address contains invalid characters' };
  }

  return { valid: true, sanitized: sanitizeString(address) };
}

/**
 * Validate city or country name.
 */
function validateCityCountry(name: string): ValidationResult {
  if (name.length < 2 || name.length > 50) {
    return { valid: false, error: 'City/Country must be 2-50 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
    return { valid: false, error: 'City/Country contains invalid characters' };
  }

  return { valid: true, sanitized: sanitizeString(name) };
}

/**
 * Sanitize string input to prevent XSS.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/["`]/g, '') // Remove backticks and quotes
    .trim();
}

/**
 * Validate entire payment form object.
 */
export function validatePaymentForm(formData: Record<string, any>): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, any> = {};

  // Required payment fields
  const requiredFields = ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv', 'cardholderName'];

  for (const field of requiredFields) {
    const result = validatePaymentInput(field, formData[field]);
    if (!result.valid) {
      errors[field] = result.error || 'Invalid input';
    } else {
      sanitized[field] = result.sanitized || formData[field];
    }
  }

  // Optional but validated fields
  const optionalFields = ['email', 'phone', 'address', 'city', 'postalCode', 'country'];
  for (const field of optionalFields) {
    if (formData[field]) {
      const result = validatePaymentInput(field, formData[field]);
      if (!result.valid) {
        errors[field] = result.error || 'Invalid input';
      } else {
        sanitized[field] = result.sanitized || formData[field];
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
