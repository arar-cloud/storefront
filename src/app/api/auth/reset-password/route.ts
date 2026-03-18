import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// URL validation - ensure HTTPS and same-origin or allowlisted domains
const ALLOWED_REDIRECT_DOMAINS = process.env.ALLOWED_REDIRECT_DOMAINS?.split(",") || [];

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

// Validate email format
function isValidEmail(email: string): boolean {
	if (typeof email !== "string" || email.length > 254) return false;
	return EMAIL_REGEX.test(email);
}

// Validate redirect URL - prevent open redirect attacks
function isValidRedirectUrl(url: string): boolean {
	if (typeof url !== "string") return false;
	try {
		const parsed = new URL(url);
		// Only allow HTTPS
		if (parsed.protocol !== "https:") return false;
		// Check against allowlist
		if (ALLOWED_REDIRECT_DOMAINS.length > 0) {
			return ALLOWED_REDIRECT_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith("." + domain));
		}
		return true;
	} catch {
		return false;
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as ResetPasswordRequest;
		// Input validation
		if (!isValidEmail(body.email)) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}
		if (!isValidRedirectUrl(body.redirectUrl)) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}
		if (typeof body.channel !== "string" || body.channel.length === 0) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}
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
	} catch (error) {
		// Log error internally but don't expose details to client
		console.error("[Password Reset Error]", error);
		return NextResponse.json(
			{ error: "Request failed" },
			{ status: 500 }
		);
	}
}
