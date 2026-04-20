import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";
import { sanitizeErrorResponse, logErrorForDebug } from "@/lib/security/response-sanitizer";

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
	const body = (await request.json()) as ResetPasswordRequest;
	const { email, channel, redirectUrl } = body;

	if (!email || !channel || !redirectUrl) {
		return NextResponse.json(
			{ errors: [{ message: "Email, channel, and redirectUrl are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<RequestPasswordResetResult>({
		query: REQUEST_PASSWORD_RESET_MUTATION,
		variables: { email, channel, redirectUrl },
	});

	// Network or GraphQL error
	if (!result.ok) {
		logErrorForDebug(result.error, { endpoint: '/api/auth/reset-password', type: 'graphql' });
		const sanitized = sanitizeErrorResponse(result.error, result.error.type === "network" ? 503 : 400);
		return NextResponse.json(sanitized, { status: result.error.type === "network" ? 503 : 400 });
	}

	const requestPasswordReset = result.data.requestPasswordReset;

	// Saleor validation errors - log but don't expose to prevent email enumeration
	if (requestPasswordReset?.errors?.length) {
		logErrorForDebug(requestPasswordReset.errors, { endpoint: '/api/auth/reset-password', type: 'validation' });
		// Still return success to prevent email enumeration
	}

	// Always return success to prevent email enumeration
	return NextResponse.json({ success: true });
}
