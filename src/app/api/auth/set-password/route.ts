import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

function generateCorrelationId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface LogContext {
	correlationId: string;
	operationName: string;
	timestamp: number;
}

function createLogger(context: LogContext) {
	return {
		info: (message: string, meta?: Record<string, unknown>) =>
			console.info(
				JSON.stringify({
					level: "info",
					message,
					correlationId: context.correlationId,
					operation: context.operationName,
					timestamp: context.timestamp,
					...meta,
				}),
			),
		error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
			console.error(
				JSON.stringify({
					level: "error",
					message,
					correlationId: context.correlationId,
					operation: context.operationName,
					timestamp: context.timestamp,
					errorMessage: error?.message,
					errorStack: error?.stack,
					...meta,
				}),
			),
	};
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
	const correlationId = generateCorrelationId();
	const logger = createLogger({
		correlationId,
		operationName: "SetPassword",
		timestamp: Date.now(),
	});
	logger.info("Set password request initiated", { correlationId });
	const body = (await request.json()) as SetPasswordRequest;
	const { email, token, password } = body;

	if (!email || !token || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email, token, and password are required", code: "REQUIRED" }] },
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
		logger.error("Set password GraphQL error", new Error(result.error.type), { errorType: result.error.type });
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const setPassword = result.data.setPassword;

	// Saleor validation errors
	if (setPassword?.errors?.length) {
		logger.error("Set password validation errors", new Error("Validation failed"), { errorCount: setPassword.errors.length });
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
