import Joi from "joi";

/**
 * Joi Validation Schemas for Authentication Routes
 * Provides centralized, reusable validation with consistent error handling
 */

// Email validation schema
const emailSchema = Joi.string()
  .email()
  .required()
  .max(255)
  .messages({
    "string.email": "Invalid email format",
    "string.empty": "Email is required",
    "string.max": "Email must not exceed 255 characters",
  });

// Password validation schema
const passwordSchema = Joi.string()
  .required()
  .min(8)
  .max(128)
  .regex(/[A-Z]/) // At least one uppercase
  .regex(/[a-z]/) // At least one lowercase
  .regex(/[0-9]/) // At least one digit
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 128 characters",
    "string.pattern.base":
      "Password must contain uppercase, lowercase, and digit characters",
  });

// Channel validation schema
const channelSchema = Joi.string()
  .alphanum()
  .required()
  .max(50)
  .messages({
    "string.empty": "Channel is required",
    "string.alphanum": "Channel must be alphanumeric",
    "string.max": "Channel must not exceed 50 characters",
  });

// Redirect URL validation schema
const redirectUrlSchema = Joi.string()
  .uri()
  .required()
  .max(2048)
  .messages({
    "string.empty": "Redirect URL is required",
    "string.uri": "Invalid redirect URL format",
    "string.max": "Redirect URL must not exceed 2048 characters",
  });

// Request Password Reset
export const requestPasswordResetSchema = Joi.object({
  email: emailSchema,
  channel: channelSchema,
  redirectUrl: redirectUrlSchema,
}).unknown(false);

// Register User
export const registerSchema = Joi.object({
  firstName: Joi.string()
    .required()
    .max(100)
    .messages({
      "string.empty": "First name is required",
      "string.max": "First name must not exceed 100 characters",
    }),
  lastName: Joi.string()
    .required()
    .max(100)
    .messages({
      "string.empty": "Last name is required",
      "string.max": "Last name must not exceed 100 characters",
    }),
  email: emailSchema,
  password: passwordSchema,
  channel: channelSchema,
}).unknown(false);

// Set Password
export const setPasswordSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  token: Joi.string()
    .required()
    .max(500)
    .messages({
      "string.empty": "Password token is required",
      "string.max": "Password token must not exceed 500 characters",
    }),
}).unknown(false);

/**
 * Validate request body against schema
 * Returns validated data or throws error with field-specific messages
 */
export function validateRequestBody(
  body: unknown,
  schema: Joi.ObjectSchema
): Record<string, unknown> {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const fieldErrors = error.details.reduce(
      (acc, detail) => {
        acc[detail.path.join(".")] = detail.message;
        return acc;
      },
      {} as Record<string, string>
    );
    throw new ValidationError("Validation failed", fieldErrors);
  }

  return value;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string>
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
