import { z } from "zod";

/**
 * Security: Centralized input validation schemas for auth endpoints.
 * Prevents injection attacks, XSS, and malformed input processing.
 */

// Email validation: RFC 5322 simplified
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .max(255, "Email too long");

// Password validation: enforce minimum complexity
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  // Prevent common weak patterns (all lowercase, all uppercase, all digits)
  .refine(
    (pwd) => /[A-Z]/.test(pwd) || /[0-9]/.test(pwd),
    "Password must contain uppercase letter or number"
  )
  .refine(
    (pwd) => /[a-z]/.test(pwd),
    "Password must contain lowercase letter"
  );

// Token validation: alphanumeric and special chars common in tokens
const tokenSchema = z
  .string()
  .trim()
  .min(1, "Token required")
  .max(1000, "Token too long")
  .regex(/^[a-zA-Z0-9\-_.]+$/, "Invalid token format");

/**
 * Register endpoint validation
 * POST /api/auth/register
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .trim()
    .min(1, "First name required")
    .max(100, "First name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name required")
    .max(100, "Last name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters")
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Reset password request validation
 * POST /api/auth/reset-password
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Set password (from reset token) validation
 * POST /api/auth/set-password
 */
export const setPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/**
 * Safe validation wrapper with error sanitization
 * Returns user-safe error messages without exposing internal details
 */
export async function validateInput<T>(
  schema: z.ZodSchema,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log full error for debugging, but return sanitized message
      console.error("[Auth Validation] Validation failed:", error.issues);
      // Return first error message without exposing schema details
      const firstError = error.issues[0]?.message || "Invalid input";
      return { success: false, error: firstError };
    }
    console.error("[Auth Validation] Unexpected error:", error);
    return { success: false, error: "Input validation failed" };
  }
}
