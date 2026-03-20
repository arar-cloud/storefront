import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";
import { validateCsrfToken } from "@/lib/auth/csrf";
import { isValidEmail, sanitizeInput, validateRequestBody } from "@/lib/auth/input-validator";

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!, $channel: String!, $redirectUrl: String!) {
    requestPasswordReset(email: $email, channel: $channel, redirectUrl: $redirectUrl) {
      errors {
        field
        message
        code
      }
    }
  }
`;

interface ResetPasswordRequest {
	email: string;
	channel: string;
	redirectUrl: string;
}

interface RequestPasswordResetResult {
	requestPasswordReset?: {
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	// Validate CSRF token from request headers
	const sessionCsrfToken = request.headers.get("x-csrf-token");
	if (!sessionCsrfToken) {
		return NextResponse.json(
			{ errors: [{ message: "CSRF token missing", code: "CSRF_MISSING" }] },
			{ status: 403 },
		);
	}

	const body = (await request.json()) as ResetPasswordRequest;
	const { email, channel, redirectUrl } = body;

	// Validate CSRF token from request body
	if (!validateCsrfToken(body as any, sessionCsrfToken)) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid CSRF token", code: "CSRF_INVALID" }] },
			{ status: 403 },
		);
	}

	// Validate and sanitize email
	if (!email || !isValidEmail(email)) {
		return NextResponse.json(
			{ errors: [{ message: "Valid email is required", code: "INVALID_EMAIL" }] },
			{ status: 400 },
		);
	}

	// Validate required fields
	if (!channel || !redirectUrl) {
		return NextResponse.json(
			{ errors: [{ message: "Channel and redirectUrl are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	const sanitizedEmail = sanitizeInput(email);

	const result = await executeRawGraphQL<RequestPasswordResetResult>({
		query: REQUEST_PASSWORD_RESET_MUTATION,
		variables: { email, channel, redirectUrl },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Password reset error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const requestPasswordReset = result.data.requestPasswordReset;

	// Saleor validation errors - log but don't expose to prevent email enumeration
	if (requestPasswordReset?.errors?.length) {
		console.error("Password reset validation errors");
		// Still return success to prevent email enumeration
	}

	// Always return success to prevent email enumeration
	return NextResponse.json({ success: true });
}
