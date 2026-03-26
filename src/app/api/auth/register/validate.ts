import { NextRequest, NextResponse } from 'next/server';
import { validateInput, registerValidation } from '@/lib/auth/validate-input';
import { validateCSRFToken } from '@/lib/auth/csrf-protection';

/**
 * Validate incoming register request
 */
export async function validateRegisterRequest(request: NextRequest): Promise<{
  valid: boolean;
  data?: Record<string, unknown>;
  response?: NextResponse;
}> {
  try {
    // Validate CSRF token from header or body
    const csrfToken = request.headers.get('x-csrf-token') || 
                      (await request.json()).csrfToken;
    
    if (!csrfToken) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'CSRF token missing' },
          { status: 400 }
        ),
      };
    }
    
    if (!(await validateCSRFToken(csrfToken))) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        ),
      };
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = await validateInput(body, registerValidation);
    
    if (!validation.valid) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: validation.error },
          { status: 400 }
        ),
      };
    }
    
    return { valid: true, data: validation.data };
  } catch (error) {
    console.error('Register validation error:', error);
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      ),
    };
  }
}
