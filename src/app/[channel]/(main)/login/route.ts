import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validatePassword, checkRateLimit, verifyCSRFToken } from '@/lib/auth/validation';

const LOGIN_MUTATION = `
  mutation AccountLogin($input: AccountLoginInput!) {
    accountLogin(input: $input) {
      user {
        id
        email
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface LoginRequest {
  email: string;
  password: string;
  csrfToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, csrfToken } = body;
    
    // Rate limit by IP or email
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(identifier);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { status: 429, headers: { 'Retry-After': rateLimit.remaining.toString() } }
      );
    }
    
    // Validate CSRF token from session (should be stored in session store in production)
    const sessionCSRFToken = request.cookies.get('csrf-token')?.value;
    if (!sessionCSRFToken || !verifyCSRFToken(csrfToken, sessionCSRFToken)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 400 }
      );
    }
    
    // TODO: Execute GraphQL mutation with validated inputs
    // const result = await executeRawGraphQL(LOGIN_MUTATION, { input: { email, password } });
    
    return NextResponse.json(
      { message: 'Login successful' },
      {
        status: 200,
        headers: {
          'Set-Cookie': [
            'sessionId=secure-token; HttpOnly; Secure; SameSite=Strict; Path=/',
            'csrf-token=; Max-Age=0; Path=/' // Clear CSRF token after use
          ].join(', ')
        }
      }
    );
  } catch (error) {
    console.error('[Login Error]', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
