import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";

const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email format").max(254),
  redirectUrl: z.string().url("Invalid redirect URL"),
});

// Rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(clientId);
  if (!record || now > record.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + 60000 });
    return false;
  }
  if (record.count >= 3) return true;
  record.count++;
  return false;
}

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
		const clientIp = request.headers.get("x-forwarded-for") || "unknown";
		if (isRateLimited(clientIp)) {
			return NextResponse.json(
				{ errors: [{ message: "Too many requests. Please try again later." }] },
				{ status: 429 }
			);
		}

		const body = await request.json();
		const validation = ResetPasswordSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					errors: validation.error.errors.map((e) => ({
						field: e.path[0],
						message: e.message,
					})),
				},
				{ status: 400 }
			);
		}

		const { email, channel, redirectUrl } = validation.data as ResetPasswordRequest & { channel: string };

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
		console.error("Password reset handler error:", error);
		return NextResponse.json(
			{ errors: [{ message: "An error occurred. Please try again." }] },
			{ status: 500 }
		);
	}
}
