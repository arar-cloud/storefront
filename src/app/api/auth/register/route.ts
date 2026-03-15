import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

const REGISTER_MUTATION = `
  mutation AccountRegister($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      user {
        id
        email
      }
      errors {{ checkTokenRateLimit, isValidTokenFormat } from '@/lib/auth/session-security';
import { validateEmail, validateChannelId } from '@/lib/validation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Security headers for API response
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting (IP or user agent)
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const rateLimitKey = `register:${clientIp}`;

    // Check rate limiting
    if (!checkTokenRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: securityHeaders }
      );
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400, headers: securityHeaders }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate request structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Prevent prototype pollution
    if ('__proto__' in body || 'constructor' in body || 'prototype' in body) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400, headers: securityHeaders }
      );
    }

        field
        message
        code
      }
    }
  }
`;

interface RegisterRequest {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	channel: string;
	redirectUrl: string;
}

interface AccountRegisterResult {
	accountRegister?: {
		user?: { id: string; email: string };
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	const body = (await request.json()) as RegisterRequest;
	const { email, password, firstName, lastName, channel, redirectUrl } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email and password are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<AccountRegisterResult>({
		query: REGISTER_MUTATION,
		variables: {
			input: {
				email,
				password,
				firstName: firstName || "",
				lastName: lastName || "",
				channel,
				redirectUrl,
			},
		},
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Registration error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const accountRegister = result.data.accountRegister;

	// Saleor validation errors
	if (accountRegister?.errors?.length) {
		const validationResult = asValidationError(accountRegister.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Success
	return NextResponse.json({
		user: accountRegister?.user,
		message: "Account created successfully. Please check your email to verify your account.",
	});
}
