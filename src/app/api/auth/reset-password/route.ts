import { z } from "zod";

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  channel: z.string().min(1, "Channel is required"),
  redirectUrl: z.string().url("Invalid redirect URL"),
});

import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";

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
	
	// Validate input against schema
	const validated = resetPasswordSchema.safeParse(body);
	if (!validated.success) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid request format", code: "VALIDATION_ERROR" }] },
			{ status: 400 },
		);
	}
	
	const { email, channel, redirectUrl } = validated.data;

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
