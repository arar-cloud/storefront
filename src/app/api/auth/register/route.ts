import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

// Zod schema for input validation
const RegisterSchema = z.object({
  email: z.string().email("Invalid email format").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  channel: z.string().min(1),
  redirectUrl: z.string().url("Invalid redirect URL"),
});

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

// Simple in-memory rate limiter (production: use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(clientId);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + 60000 }); // 60s window
    return false;
  }
  
  if (record.count >= 5) return true; // 5 requests per minute
  record.count++;
  return false;
}

export async function POST(request: NextRequest) {
	const clientIp = request.headers.get("x-forwarded-for") || "unknown";
	if (isRateLimited(clientIp)) {
		return NextResponse.json(
			{ errors: [{ message: "Too many requests. Please try again later." }] },
			{ status: 429 }
		);
	}

	let body: RegisterRequest;
	try {
		body = (await request.json()) as RegisterRequest;
	} catch {
		return NextResponse.json(
			{ errors: [{ message: "Invalid JSON payload", code: "INVALID_JSON" }] },
			{ status: 400 }
		);
	}

	// Validate input with Zod schema
	const validation = RegisterSchema.safeParse(body);
	if (!validation.success) {
		const errors = validation.error.errors.map(err => ({
			message: err.message,
			field: String(err.path[0]),
			code: "VALIDATION_ERROR"
		}));
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { email, password, firstName, lastName, channel, redirectUrl } = validation.data;

	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email and password are required", code: "REQUIRED" }] },
			{ status: 400 }
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
