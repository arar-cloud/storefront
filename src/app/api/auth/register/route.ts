import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { isValidEmail, isStrongPassword, sanitizeInput } from "@/lib/auth/validation";

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

	// Validate and sanitize inputs
	const sanitizedEmail = sanitizeInput(email?.trim());
	const sanitizedFirstName = sanitizeInput(firstName?.trim());
	const sanitizedLastName = sanitizeInput(lastName?.trim());

	// Apply strict validation rules
	if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid email format", code: "INVALID_EMAIL" }] },
			{ status: 400 },
		);
	}

	if (!password || !isStrongPassword(password)) {
		return NextResponse.json(
			{ errors: [{ message: "Password must be at least 8 characters with uppercase, lowercase, and numbers", code: "WEAK_PASSWORD" }] },
			{ status: 400 },
		);
	}

	if (sanitizedFirstName && (sanitizedFirstName.length < 1 || sanitizedFirstName.length > 50)) {
		return NextResponse.json(
			{ errors: [{ message: "First name must be between 1 and 50 characters", code: "INVALID_FIRST_NAME" }] },
			{ status: 400 },
		);
	}

	if (sanitizedLastName && (sanitizedLastName.length < 1 || sanitizedLastName.length > 50)) {
		return NextResponse.json(
			{ errors: [{ message: "Last name must be between 1 and 50 characters", code: "INVALID_LAST_NAME" }] },
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
