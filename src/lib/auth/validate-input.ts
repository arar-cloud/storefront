import { z } from 'zod';

// Email validation schema
const emailSchema = z.string().email('Invalid email format').trim().toLowerCase();

// Password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Register request validation
export const registerValidation = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(255).trim().optional(),
  lastName: z.string().min(1).max(255).trim().optional(),
});

// Login request validation
export const loginValidation = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

// Reset password request validation
export const resetPasswordValidation = z.object({
  email: emailSchema,
});

// Set password request validation
export const setPasswordValidation = z.object({
  token: z.string().min(1).max(512).trim(),
  password: passwordSchema,
});

// Generic validation helper
export async function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const validated = await schema.parseAsync(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
