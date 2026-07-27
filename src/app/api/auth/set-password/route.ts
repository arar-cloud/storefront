import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { validateEmail, validatePassword, checkRateLimit } from "@/lib/auth/validation";

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
	const { email, token, password } = body;

	// Rate limit by email
	const rateCheck = checkRateLimit(`setpass:${email}`);
	if (!rateCheck.allowed) {
		return NextResponse.json({ errors: [{ message: rateCheck.error }] }, { status: 429 });
	}

	// Validate email format
	const emailValidation = validateEmail(email);
	if (!emailValidation.valid) {
		return NextResponse.json({ errors: [{ message: emailValidation.error }] }, { status: 400 });
	}

	// Validate token parameter - must be non-empty string
	if (!token || typeof token !== "string" || token.length === 0) {
		return NextResponse.json({ errors: [{ message: "Invalid token parameter" }] }, { status: 400 });
	}

	// Validate password strength
	const passwordValidation = validatePassword(password);
	if (!passwordValidation.valid) {
		return NextResponse.json({ errors: [{ message: passwordValidation.error }] }, { status: 400 });
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
			sameSite: "strict",
			path: "/",
			maxAge: 3600, // 1 hour
		});

		cookieStore.set("refreshToken", setPassword.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/",
			maxAge: 604800, // 7 days
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
