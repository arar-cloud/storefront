import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { handleIdempotentRequest } from "@/lib/idempotency";
import { createRateLimiter } from "@/lib/api/rate-limiter";
import { createRequestTrackingWrapper, incrementTotalErrors } from "@/lib/api/request-tracker";

const authRateLimiter = createRateLimiter({
  tokensPerInterval: 10,
  interval: 60000, // 10 requests per minute
  maxQueueSize: 50,
  name: 'auth-register',
});

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
			);
		},
		error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const stack = error instanceof Error ? error.stack : undefined;
			console.error(
				JSON.stringify({
					level: "error",
					message,
					errorMessage,
					stack,
					correlationId: context.correlationId,
					operation: context.operationName,
					timestamp: context.timestamp,
					...meta,
				}),
			);
		},
	};
}

const REGISTER_MUTATION = `
  mutation AccountRegister($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      errors {
        field
        message
      }
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

// ============================================================================
// POST Handler with Error Handling, Idempotency, and Timeout Support
// ============================================================================

export async function POST(request: NextRequest) {
	// Apply rate limiting before processing
	try {
		await authRateLimiter.acquire();
	} catch (error) {
		if (error instanceof Error && error.message.includes('overloaded')) {
			incrementTotalErrors();
			return NextResponse.json(
				{
					error: 'Service temporarily unavailable - too many requests',
				},
				{ status: 429 }
			);
		}
	}

	const correlationId = generateCorrelationId();
	const logger = createLogger({
		correlationId,
		operationName: "POST /api/auth/register",
		timestamp: Date.now(),
	});

	try {
		// Extract and validate idempotency key
		const idempotencyKey = request.headers.get("idempotency-key");

		logger.info("Register request received", {
			idempotencyKey: idempotencyKey ? "present" : "missing",
		});

		// Parse request body with timeout
		let body: unknown;
		try {
			body = await Promise.race([
				request.json(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Request parsing timeout")), 5000)
				),
			]);
		} catch (error) {
			logger.error("Failed to parse request body", error);
			return NextResponse.json(
				{
					errors: [{ message: "Invalid request body" }],
					correlationId,
				},
				{ status: 400 }
			);
		}

		// Validate input structure
		if (!body || typeof body !== "object") {
			logger.error("Invalid request body structure", null);
			return NextResponse.json(
				{
					errors: [{ message: "Request body must be a JSON object" }],
					correlationId,
				},
				{ status: 400 }
			);
		}

		// Handle idempotent request
		try {
			const response = await handleIdempotentRequest(
				idempotencyKey || undefined,
				async () => {
					// Execute GraphQL mutation with timeout
					const timeoutController = new AbortController();
					const timeoutId = setTimeout(() => {
						timeoutController.abort();
					}, 30000);

					try {
						const result = await Promise.race([
							executeRawGraphQL(REGISTER_MUTATION, body as Record<string, unknown>),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("GraphQL request timeout")), 28000)
							),
						]);

						if (result.errors?.length) {
							const message = getUserMessage(result);
							logger.error("GraphQL errors received", null, {
								errorCount: result.errors.length,
							});
							return { errors: result.errors, data: result.data };
						}

						logger.info("Registration successful", {
							userId: result.data?.accountRegister?.user?.id,
						});
						return { errors: [], data: result.data };
					} finally {
						clearTimeout(timeoutId);
					}
				}
			);

			if ("error" in response) {
				logger.error("Idempotency validation failed", null, { error: response.error });
				return NextResponse.json(
					{
						errors: [{ message: response.error }],
						correlationId,
					},
					{ status: 400 }
				);
			}

			const status = response.result.errors?.length ? 400 : 200;
			logger.info("Register response sent", { status, cached: response.cached });

			return NextResponse.json(
				{
					error: response.result.errors,
					data: response.result.data,
					correlationId,
					cached: response.cached,
				},
				{ status }
			);
		} catch (error) {
			logger.error("Idempotency handler failed", error);
			return NextResponse.json(
				{
					errors: [{ message: "Internal server error" }],
					correlationId,
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		logger.error("Unhandled error in register handler", error);
		return NextResponse.json(
			{
				errors: [{ message: "Internal server error" }],
				correlationId,
			},
			{ status: 500 }
		);
	} finally {
		// Release rate limit token
		authRateLimiter.release();
	}
}
