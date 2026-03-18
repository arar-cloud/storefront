import { NextRequest, NextResponse } from "next/server";
import {
  registerSchema,
  validateRequestBody,
  ValidationError,
} from "@/lib/auth/validation-schemas";
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
	try {
		const body = (await request.json()) as RegisterRequest;

		// Validate request body using Joi schema
		const validatedData = validateRequestBody(body, registerSchema);

		const { email, password, firstName, lastName, channel, redirectUrl } = validatedData;

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
	} catch (error) {
		// Handle validation errors
		if (error instanceof ValidationError) {
			return NextResponse.json(
				{
					error: "Validation failed",
					fields: error.fieldErrors,
				},
				{ status: 400 }
			);
		}

		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: "Failed to process registration" },
			{ status: 500 }
		);
	}
}
