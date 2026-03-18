import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";
import {
  requestPasswordResetSchema,
  validateRequestBody,
  ValidationError,
} from "@/lib/auth/validation-schemas";
import { validateAndSanitizeUrl } from "@/lib/auth/sanitize";

// URL validation - ensure HTTPS and same-origin or allowlisted domains
const ALLOWED_REDIRECT_DOMAINS = process.env.ALLOWED_REDIRECT_DOMAINS?.split(",")
  .map((domain) => domain.trim())
  .filter(Boolean) || [];

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
	try {
		const body = await request.json();

		// Validate request body using Joi schema
		const validatedData = validateRequestBody(
			body,
			requestPasswordResetSchema
		);
		const { email, channel, redirectUrl } = validatedData as ResetPasswordRequest;

		// Validate and sanitize redirect URL
		const sanitizedRedirectUrl = validateAndSanitizeUrl(
			redirectUrl,
			ALLOWED_REDIRECT_DOMAINS
		);

		if (!sanitizedRedirectUrl.isValid) {
			return NextResponse.json(
				{ error: sanitizedRedirectUrl.error || "Invalid redirect URL" },
				{ status: 400 }
			);
		}

		const result = await executeRawGraphQL<RequestPasswordResetResult>({
			query: REQUEST_PASSWORD_RESET_MUTATION,
			variables: { email, channel, redirectUrl: sanitizedRedirectUrl.url },
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
		// Handle validation errors
		if (error instanceof ValidationError) {
			return NextResponse.json(
				{
					error: "Validation failed",
					fields: error.fieldErrors,
				},
				{ status: 400 }
			);
		}

		// Log error internally but don't expose details to client
		console.error("[Password Reset Error]", error);
		return NextResponse.json(
			{ error: "Request failed" },
			{ status: 500 }
		);
	}
}
