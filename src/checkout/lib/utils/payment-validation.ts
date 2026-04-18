/**
 * Server-side validation and sanitization for payment forms.
 * Prevents malformed data and injection attacks from reaching backend.
 */

// Validation patterns
const CARD_NUMBER_PATTERN = /^[0-9]{13,19}$/;
const CVV_PATTERN = /^[0-9]{3,4}$/;
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_CODE_PATTERN = /^[A-Za-z0-9\s\-]{3,20}$/;

export interface PaymentValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Sanitize string input: remove dangerous characters and trim
 */
export function sanitizeString(input: unknown, maxLength: number = 255): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate card number (Luhn algorithm)
 */
export function validateCardNumber(cardNumber: unknown): PaymentValidationError | null {
  if (typeof cardNumber !== "string") {
    return {
      field: "cardNumber",
      message: "Card number must be a string",
      severity: "error",
    };
  }

  const sanitized = cardNumber.replace(/\s/g, "");
  if (!CARD_NUMBER_PATTERN.test(sanitized)) {
    return {
      field: "cardNumber",
      message: "Card number must be 13-19 digits",
      severity: "error",
    };
  }

  // Luhn algorithm check
  let sum = 0;
  let isEven = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return {
      field: "cardNumber",
      message: "Invalid card number (failed Luhn check)",
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: unknown): PaymentValidationError | null {
  if (typeof cvv !== "string") {
    return {
      field: "cvv",
      message: "CVV must be a string",
      severity: "error",
    };
  }

  if (!CVV_PATTERN.test(cvv)) {
    return {
      field: "cvv",
      message: "CVV must be 3-4 digits",
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate expiry date (MM/YY format)
 */
export function validateExpiry(expiry: unknown): PaymentValidationError | null {
  if (typeof expiry !== "string") {
    return {
      field: "expiry",
      message: "Expiry date must be a string",
      severity: "error",
    };
  }

  if (!EXPIRY_PATTERN.test(expiry)) {
    return {
      field: "expiry",
      message: "Expiry date must be in MM/YY format",
      severity: "error",
    };
  }

  // Check if card is expired
  const [month, year] = expiry.split("/").map(Number);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      field: "expiry",
      message: "Card has expired",
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate email address
 */
export function validateEmail(email: unknown): PaymentValidationError | null {
  if (typeof email !== "string") {
    return {
      field: "email",
      message: "Email must be a string",
      severity: "error",
    };
  }

  const sanitized = sanitizeString(email, 254);
  if (!EMAIL_PATTERN.test(sanitized)) {
    return {
      field: "email",
      message: "Invalid email address format",
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate postal code
 */
export function validatePostalCode(postalCode: unknown): PaymentValidationError | null {
  if (typeof postalCode !== "string") {
    return {
      field: "postalCode",
      message: "Postal code must be a string",
      severity: "error",
    };
  }

  if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    return {
      field: "postalCode",
      message: "Postal code contains invalid characters",
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate complete payment form
 */
export function validatePaymentForm(formData: Record<string, unknown>): PaymentValidationError[] {
  const errors: PaymentValidationError[] = [];

  // Validate each field if present
  if (formData.cardNumber !== undefined) {
    const cardError = validateCardNumber(formData.cardNumber);
    if (cardError) errors.push(cardError);
  }

  if (formData.cvv !== undefined) {
    const cvvError = validateCVV(formData.cvv);
    if (cvvError) errors.push(cvvError);
  }

  if (formData.expiry !== undefined) {
    const expiryError = validateExpiry(formData.expiry);
    if (expiryError) errors.push(expiryError);
  }

  if (formData.email !== undefined) {
    const emailError = validateEmail(formData.email);
    if (emailError) errors.push(emailError);
  }

  if (formData.postalCode !== undefined) {
    const postalError = validatePostalCode(formData.postalCode);
    if (postalError) errors.push(postalError);
  }

  return errors;
}
