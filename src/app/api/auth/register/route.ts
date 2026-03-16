import { NextRequest, NextResponse } from "next/server";

/**
 * Strip sensitive data from API responses
 */
function stripSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const sensitiveKeys = ["token", "refreshToken", "secret", "password", "apiKey", "Authorization"];
  const cleaned = JSON.parse(JSON.stringify(obj));

  const removeKeys = (o: any) => {
    if (typeof o !== "object" || o === null) return;
    for (const key of sensitiveKeys) {
      if (key in o) delete o[key];
    }
    for (const key in o) {
      if (typeof o[key] === "object") removeKeys(o[key]);
    }
  };

  removeKeys(cleaned);
  return cleaned;
}
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

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
	// Validate required environment variables
	if (!process.env.NEXTAUTH_URL) {
		return NextResponse.json(
			{ error: "Server configuration error: NEXTAUTH_URL not set" },
			{ status: 500 },
		);
	}

	const body = (await request.json()) as RegisterRequest;
	const { email, password, firstName, lastName, channel, redirectUrl } = body;

	// Validate and sanitize input
	if (!email || typeof email !== "string" || !email.trim()) {
		return NextResponse.json(
			{ errors: [{ message: "Valid email is required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}
	if (!password || typeof password !== "string" || password.length < 8) {
		return NextResponse.json(
			{ errors: [{ message: "Password must be at least 8 characters", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}
	const sanitizedEmail = email.trim().toLowerCase();

	const result = await executeRawGraphQL<AccountRegisterResult>({
		query: REGISTER_MUTATION,
		variables: {
			input: {
				email: sanitizedEmail,
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
