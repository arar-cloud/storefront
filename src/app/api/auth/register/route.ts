import { z } from "zod";
import { checkRateLimit, getRateLimitRemaining } from "@/lib/auth/rate-limit";
import { applySecurityHeaders } from "@/lib/auth/security-headers";
import { sanitizeEmail, sanitizeName } from "@/lib/auth/sanitize";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain uppercase").regex(/[0-9]/, "Password must contain numbers"),
  firstName: z.string().min(1, "First name required").max(100),
  lastName: z.string().min(1, "Last name required").max(100),
});

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
	try {
		const body = (await request.json()) as RegisterRequest;
		
		// Apply rate limiting by email
		const { email } = body;
		if (!checkRateLimit(`register:${email}`)) {
			return NextResponse.json(
				{ error: "Too many registration attempts. Please try again later." },
				{ status: 429, headers: { "Retry-After": "900" } }
			);
		}
		
		// Validate input against schema
		const validated = registerSchema.safeParse(body);
		if (!validated.success) {
			return NextResponse.json(
				{ errors: [{ message: "Validation failed", code: "VALIDATION_ERROR", details: validated.error.flatten() }] },
				{ status: 400 },
			);
		}
		
		let { email, password, firstName, lastName } = validated.data;
		
		// Sanitize inputs
		email = sanitizeEmail(email);
		firstName = sanitizeName(firstName);
		lastName = sanitizeName(lastName);
		
		const { channel, redirectUrl } = body;
		
		if (!channel || !redirectUrl) {
			return NextResponse.json(
				{ errors: [{ message: "Channel and redirectUrl are required", code: "REQUIRED" }] },
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
		const response = NextResponse.json({
			user: accountRegister?.user,
			message: "Account created successfully. Please check your email to verify your account.",
		});
		return applySecurityHeaders(response);
	} catch (err) {
		console.error("Registration exception:", err);
		return NextResponse.json(
			{ errors: [{ message: "Internal server error", code: "INTERNAL_ERROR" }] },
			{ status: 500 },
		);
	}
}
