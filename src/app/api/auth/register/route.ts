import { registerSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

import { NextRequest, NextResponse } from "next/server";
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
	let body;
	try {
		body = (await request.json()) as RegisterRequest;
	} catch {
		return NextResponse.json(
			{ errors: [{ message: "Invalid JSON", code: "INVALID_JSON" }] },
			{ status: 400 },
		);
	}

	// Validate input against schema
	try {
		registerSchema.parse(body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					errors: error.errors.map(e => ({
						message: e.message,
						field: e.path.join('.'),
						code: 'VALIDATION_ERROR'
					}))
				},
				{ status: 400 },
			);
		}
		throw error;
	}

	const { email, password, firstName, lastName, channel, redirectUrl } = body;

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
