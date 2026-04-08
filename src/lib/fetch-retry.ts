/**
 * Retry wrapper for fetch. Used in urql client setup (Root.tsx, AuthProvider.tsx).
 * Retries on network errors and 5xx responses with exponential backoff + jitter.
 * Includes circuit breaker to prevent cascading failures.
 */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// ============================================================================
// Circuit Breaker for Cascading Failure Prevention
// ============================================================================

interface CircuitBreakerState {
	failureCount: number;
	lastFailureTime: number;
	isOpen: boolean;
}

class CircuitBreaker {
	private static instance: CircuitBreaker;
	private state: CircuitBreakerState = {
		failureCount: 0,
		lastFailureTime: 0,
		isOpen: false,
	};
	private readonly FAILURE_THRESHOLD = 5;
	private readonly RESET_TIMEOUT_MS = 60000;

	private constructor() {}

	static getInstance(): CircuitBreaker {
		if (!CircuitBreaker.instance) {
			CircuitBreaker.instance = new CircuitBreaker();
		}
		return CircuitBreaker.instance;
	}

	recordFailure(): void {
		this.state.failureCount++;
		this.state.lastFailureTime = Date.now();
		if (this.state.failureCount >= this.FAILURE_THRESHOLD) {
			this.state.isOpen = true;
			console.error(
				`[CircuitBreaker] Opened after ${this.state.failureCount} failures. Rejecting requests for ${this.RESET_TIMEOUT_MS}ms.`,
			);
		}
	}

	isOpen(): boolean {
		if (
			this.state.isOpen &&
			Date.now() - this.state.lastFailureTime > this.RESET_TIMEOUT_MS
		) {
			this.state.isOpen = false;
			this.state.failureCount = 0;
			console.info("[CircuitBreaker] Closed. Resuming requests.");
		}
		return this.state.isOpen;
	}

	recordSuccess(): void {
		this.state.failureCount = Math.max(0, this.state.failureCount - 1);
	}
}

const circuitBreaker = CircuitBreaker.getInstance();

/**
 * Add jitter to backoff delay to prevent synchronized retry storms
 */
function addJitter(delay: number): number {
	const jitterAmount = delay * 0.1 * Math.random();
	return delay + jitterAmount;
}

interface RetryOptions {
	/** Maximum number of retries (default: 2) */
	maxRetries?: number;
	/** Base delay in ms, doubles on each retry (default: 500) */
	baseDelay?: number;
	/** Enable circuit breaker (default: true) */
	enableCircuitBreaker?: boolean;
}

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Wrap fetch with automatic retry for transient failures (network errors, 5xx). */
export function withRetry(
	baseFetch: FetchFn,
	{ maxRetries = 2, baseDelay = 500, enableCircuitBreaker = true }: RetryOptions = {},
): FetchFn {
	return async (input, init) => {
		let lastError: Error | null = null;

		// Check circuit breaker before attempting request
		if (enableCircuitBreaker && circuitBreaker.isOpen()) {
			const error = new Error(
				"[CircuitBreaker] Request rejected due to cascading failures. Service unavailable.",
			);
			console.error(error.message);
			throw error;
		}

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await baseFetch(input, init);
				circuitBreaker.recordSuccess();

				// Retry on transient server errors
				if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
					const delayWithJitter = addJitter(baseDelay * Math.pow(2, attempt));
					console.warn(
						`[RetryWithBackoff] Attempt ${attempt + 1}/${maxRetries + 1} failed (status ${response.status}). Retrying in ${delayWithJitter}ms.`,
					);
					await sleep(delayWithJitter);
					continue;
				}

				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Retry on network errors
				if (attempt < maxRetries) {
					await sleep(baseDelay * Math.pow(2, attempt));
					continue;
				}
			}
		}

		// Record failure for circuit breaker
		if (enableCircuitBreaker) {
			circuitBreaker.recordFailure();
		}

		throw lastError ?? new Error("Fetch failed after retries");
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
