/**
 * API Request Validation Middleware
 * Ensures consistent request validation across all routes
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  transform?: (value: any) => any;
}

export class RequestValidator {
  private rules: ValidationRule[];

  constructor(rules: ValidationRule[]) {
    this.rules = rules;
  }

  validate(data: Record<string, any>): {
    valid: boolean;
    data?: Record<string, any>;
    errors?: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    const validated: Record<string, any> = {};

    for (const rule of this.rules) {
      const value = data[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[rule.field] = `${rule.field} is required`;
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors[rule.field] = `${rule.field} must be ${rule.type}`;
        continue;
      }

      // String-specific validations
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.maxLength && value.length > rule.maxLength) {
          errors[rule.field] = `${rule.field} exceeds maximum length of ${rule.maxLength}`;
          continue;
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors[rule.field] = `${rule.field} must be at least ${rule.minLength} characters`;
          continue;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors[rule.field] = `${rule.field} format is invalid`;
          continue;
        }
      }

      // Apply transform if provided
      validated[rule.field] = rule.transform ? rule.transform(value) : value;
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, data: validated };
  }
}

export function createValidationError(message: string, status: number = 400) {
  return NextResponse.json(
    {
      error: message,
      code: 'VALIDATION_ERROR',
      retryable: false,
    },
    { status }
  );
}

export function createRetryableError(message: string, status: number = 500) {
  return NextResponse.json(
    {
      error: message,
      code: 'RETRYABLE_ERROR',
      retryable: true,
    },
    { status }
  );
}

export async function validateRequest(
  request: NextRequest,
  rules: ValidationRule[]
): Promise<{ valid: boolean; data?: any; error?: NextResponse }> {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return {
        valid: false,
        error: createValidationError('Content-Type must be application/json'),
      };
    }

    const body = await request.json();
    const validator = new RequestValidator(rules);
    const result = validator.validate(body);

    if (!result.valid) {
      return {
        valid: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: result.errors,
            retryable: false,
          },
          { status: 400 }
        ),
      };
    }

    return { valid: true, data: result.data };
  } catch (error) {
    console.error('Request validation error:', error);
    return {
      valid: false,
      error: createValidationError('Invalid request format'),
    };
  }
}
