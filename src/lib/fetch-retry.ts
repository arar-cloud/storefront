/**
 * Retry wrapper for fetch. Used in urql client setup (Root.tsx, AuthProvider.tsx).
 * Retries on network errors and 5xx responses with exponential backoff.
 */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

interface RetryOptions {
	/** Maximum number of retries (default: 3) */
	maxRetries?: number;
	/** Base delay in ms, doubles on each retry (default: 500) */
	baseDelay?: number;
	/** Maximum delay cap in ms for exponential backoff (default: 5000) */
	maxDelay?: number;
	/** Backoff multiplier for exponential calculation (default: 2) */
	backoffMultiplier?: number;
	/** Add randomized jitter to prevent thundering herd (default: true) */
	jitter?: boolean;
	/** Request timeout in ms (default: 30000) */
	timeout?: number;
	/** Custom retryable status codes (default: [408, 429, 500, 502, 503, 504]) */
	retryableStatusCodes?: number[];
}

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Wrap fetch with automatic retry for transient failures (network errors, 5xx). */
function calculateBackoff(
	attempt: number,
	baseDelay: number,
	maxDelay: number,
	multiplier: number = 2,
	useJitter: boolean = true,
): number {
	const exponential = Math.pow(multiplier, attempt) * baseDelay;
	const capped = Math.min(exponential, maxDelay);
	if (!useJitter) return capped;
	// Add jitter: 50-100% of calculated delay to prevent thundering herd
	return capped * (0.5 + Math.random() * 0.5);
}

export function withRetry(
	baseFetch: FetchFn,
	{ maxRetries = 3, baseDelay = 500, maxDelay = 5000, backoffMultiplier = 2, jitter = true, timeout = 30000, retryableStatusCodes }: RetryOptions = {},
): FetchFn {
	const statusCodesToRetry = retryableStatusCodes ? new Set(retryableStatusCodes) : RETRYABLE_STATUS_CODES;

	return async (input, init) => {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);
				
				const response = await baseFetch(input, {
					...init,
					signal: controller.signal,
				});
				
				clearTimeout(timeoutId);

				// Retry on transient server errors
				if (statusCodesToRetry.has(response.status) && attempt < maxRetries) {
					await sleep(calculateBackoff(attempt, baseDelay, maxDelay, backoffMultiplier, jitter));
					continue;
				}

				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Retry on network errors and timeouts
				if (attempt < maxRetries) {
					await sleep(calculateBackoff(attempt, baseDelay, maxDelay, backoffMultiplier, jitter));
					continue;
				}
			}
		}

		throw lastError ?? new Error("Fetch failed after retries");
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
