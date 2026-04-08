import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { handleIdempotentRequest } from "@/lib/idempotency";

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

const SET_PASSWORD_MUTATION = `
  mutation SetPassword($input: SetPasswordInput!) {
    setPassword(input: $input) {
      errors {
        field
        message
      }
      user {
        id
        email
      }
    }
  }
`;

export async function POST(request: NextRequest) {
	const correlationId = generateCorrelationId();
	const logger = createLogger({
		correlationId,
		operationName: "POST /api/auth/set-password",
		timestamp: Date.now(),
	});

	try {
		const idempotencyKey = request.headers.get("idempotency-key");

		logger.info("Set password request received", {
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

		try {
			const response = await handleIdempotentRequest(
				idempotencyKey || undefined,
				async () => {
					const result = await Promise.race([
						executeRawGraphQL(SET_PASSWORD_MUTATION, body as Record<string, unknown>),
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

					logger.info("Password set successfully", {
						userId: result.data?.setPassword?.user?.id,
					});
					return { errors: [], data: result.data };
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
			logger.info("Set password response sent", { status, cached: response.cached });

			return NextResponse.json(
				{
					errors: response.result.errors,
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
		logger.error("Unhandled error in set password handler", error);
		return NextResponse.json(
			{
				errors: [{ message: "Internal server error" }],
				correlationId,
			},
			{ status: 500 }
		);
	}
}
