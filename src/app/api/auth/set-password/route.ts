import { z } from "zod";

const setPasswordSchema = z.object({
  token: z.string().min(20, "Invalid token"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain uppercase").regex(/[0-9]/, "Password must contain numbers"),
});

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

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
	const body = (await request.json()) as SetPasswordRequest;
	
	// Validate input with strict schema
	const validated = setPasswordSchema.safeParse({
		token: body.token,
		password: body.password,
	});
	if (!validated.success) {
		return NextResponse.json(
			{ errors: [{ message: "Validation failed: " + validated.error.errors.map(e => e.message).join(", "), code: "VALIDATION_ERROR" }] },
			{ status: 400 },
		);
	}
	
	const { email, token, password } = body;

	if (!email) {
		return NextResponse.json(
			{ errors: [{ message: "Email is required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (password.length < 8) {
		return NextResponse.json(
			{ errors: [{ message: "Password must be at least 8 characters", code: "PASSWORD_TOO_SHORT" }] },
			{ status: 400 },
		);
	}

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
}
