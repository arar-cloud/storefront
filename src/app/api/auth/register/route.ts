import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { validateCsrfToken } from "@/lib/auth/csrf";
import { isValidEmail, validatePassword, sanitizeInput, validateRequestBody } from "@/lib/auth/input-validator";

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

	// Validate CSRF token
	const csrfToken = body.csrfToken || request.headers.get("x-csrf-token");
	if (!csrfToken || !validateCsrfToken(csrfToken)) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid CSRF token", code: "CSRF_INVALID" }] },
			{ status: 403 },
		);
	}

	// Validate required fields
	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email and password are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	// Validate email format
	if (!isValidEmail(email)) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid email format", code: "INVALID_EMAIL" }] },
			{ status: 400 },
		);
	}

	// Validate password strength
	const passwordValidation = validatePassword(password);
	if (!passwordValidation.isValid) {
		return NextResponse.json(
			{ errors: [{ message: passwordValidation.message, code: "INVALID_PASSWORD" }] },
			{ status: 400 },
		);
	}

	// Sanitize inputs
	const sanitizedEmail = sanitizeInput(email);
	const sanitizedFirstName = firstName ? sanitizeInput(firstName) : "";
	const sanitizedLastName = lastName ? sanitizeInput(lastName) : "";

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
