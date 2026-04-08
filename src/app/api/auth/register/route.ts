import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

// ============================================================================
// Structured Logging with Correlation IDs
// ============================================================================

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
		info: (message: string, meta?: Record<string, unknown>) => {
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
		);
	},
		error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
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
		);
	},
		warn: (message: string, meta?: Record<string, unknown>) => {
			console.warn(
				JSON.stringify({
					level: "warn",
					message,
					correlationId: context.correlationId,
					operation: context.operationName,
					timestamp: context.timestamp,
					...meta,
				}),
			),
		);
	},
	};
}

const REGISTER_MUTATION = `
  mutation AccountRegister($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      user {
        id
        email
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface RegisterRequest {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	channel: string;
	redirectUrl: string;
}

interface AccountRegisterResult {
	accountRegister?: {
		user?: { id: string; email: string };
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	const body = (await request.json()) as RegisterRequest;
	const { email, password, firstName, lastName, channel, redirectUrl } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email and password are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<AccountRegisterResult>({
		query: REGISTER_MUTATION,
		variables: {
			input: {
				email,
				password,
				firstName: firstName || "",
				lastName: lastName || "",
				channel,
				redirectUrl,
			},
		},
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Registration error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const accountRegister = result.data.accountRegister;

	// Saleor validation errors
	if (accountRegister?.errors?.length) {
		const validationResult = asValidationError(accountRegister.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Success
	return NextResponse.json({
		user: accountRegister?.user,
		message: "Account created successfully. Please check your email to verify your account.",
	});
}
