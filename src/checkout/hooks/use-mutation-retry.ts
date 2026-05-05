import { useCallback } from "react";
import { type AnyVariables, type UseMutationResponse } from "urql";

export interface RetryConfig {
	/** Maximum number of retry attempts */
	maxRetries?: number;
	/** Initial delay in milliseconds */
	initialDelay?: number;
	/** Multiplier for exponential backoff */
	backoffMultiplier?: number;
	/** Maximum delay cap in milliseconds */
	maxDelay?: number;
	/** Predicate to determine if error is retryable */
	isRetryable?: (error: any) => boolean;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
	maxRetries: 3,
	initialDelay: 100,
	backoffMultiplier: 2,
	maxDelay: 5000,
	isRetryable: (error) => {
		// Retry on network errors and 5xx errors, not 4xx
		if (!error) return false;
		const status = error.status || error.networkError?.status;
		return status === undefined || status >= 500;
	},
};

/**
 * Wraps a mutation function with exponential backoff retry logic.
 * Useful for resilience in security-critical operations.
 */
export function useMutationWithRetry<TData, TVariables extends AnyVariables>(
	mutationFn: (variables: TVariables) => Promise<any>,
	config: RetryConfig = {},
) {
	const settings = { ...DEFAULT_CONFIG, ...config };

	return useCallback(
		async (variables: TVariables): Promise<TData | null> => {
			let lastError: Error | null = null;

			for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
				try {
					const result = await mutationFn(variables);
					return result.data || null;
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));

					// Don't retry if error is not retryable or we've exhausted retries
					if (!settings.isRetryable(error) || attempt === settings.maxRetries) {
						throw lastError;
					}

					// Calculate exponential backoff delay
					const delay = Math.min(
						settings.initialDelay * Math.pow(settings.backoffMultiplier, attempt),
						settings.maxDelay,
					);

					// Add jitter to prevent thundering herd
					const jitter = delay * Math.random() * 0.1;
					await new Promise((resolve) => setTimeout(resolve, delay + jitter));
				}
			}

			throw lastError || new Error("Mutation failed after retries");
		},
		[settings],
	);
}

/**
 * Error boundary component for mutation errors.
 * Catches and displays mutation-specific errors gracefully.
 */
export class MutationErrorBoundary extends Error {
	constructor(
		public operation: string,
		public originalError: Error,
	) {
		super(`Mutation error in ${operation}: ${originalError.message}`);
		this.name = "MutationErrorBoundary";
	}
}
