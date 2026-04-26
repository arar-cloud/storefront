import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

const SetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  channel: z.string().min(1),
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
  if (record.count >= 5) return true;
  record.count++;
  return false;
}

const SET_PASSWORD_MUTATION = `
  mutation SetPassword($email: String!, $token: String!, $password: String!) {
    setPassword(email: $email, token: $token, password: $password) {
      token
      refreshToken
      errors {
        field
        message
        code
      }
    }
  }
`;

interface SetPasswordRequest {
	email: string;
	token: string;
	password: string;
}

interface SetPasswordResult {
	setPassword?: {
		token?: string;
		refreshToken?: string;
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
		const validation = SetPasswordSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					errors: validation.error.errors.map((e) => ({
						field: String(e.path[0]),
						message: e.message,
					})),
				},
				{ status: 400 }
			);
		}

		const { email, token, password } = validation.data as SetPasswordRequest;

	const result = await executeRawGraphQL<SetPasswordResult>({
		query: SET_PASSWORD_MUTATION,
		variables: { email, token, password },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Set password error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const setPassword = result.data.setPassword;

	// Saleor validation errors
	if (setPassword?.errors?.length) {
		console.error("Set password validation errors");
		const validationResult = asValidationError(setPassword.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	if (setPassword?.token && setPassword?.refreshToken) {
		// Set auth cookies
		const cookieStore = await cookies();

		cookieStore.set("token", setPassword.token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60, // 1 hour
		});

		cookieStore.set("refreshToken", setPassword.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});

		return NextResponse.json({
			success: true,
			token: setPassword.token,
			message: "Password updated successfully",
		});
	}

		return NextResponse.json(
			{ errors: [{ message: "Failed to set password", code: "UNKNOWN" }] },
			{ status: 500 },
		);
	} catch (error) {
		console.error("Set password error:", error);
		return NextResponse.json(
			{ errors: [{ message: "Internal server error", code: "INTERNAL_ERROR" }] },
			{ status: 500 },
		);
	}
}
