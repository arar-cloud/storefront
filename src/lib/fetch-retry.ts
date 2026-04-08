/**
 * Retry wrapper for fetch. Used in urql client setup (Root.tsx, AuthProvider.tsx).
 * Retries on network errors and 5xx responses with exponential backoff + jitter.
 * Includes circuit breaker to prevent cascading failures and enforces timeout policies.
 */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_TIMEOUT_MS = 120000; // 2 minutes
const BACKOFF_BASE_MS = 100;
const MAX_RETRIES = 3;

// ============================================================================
// Circuit Breaker for Cascading Failure Prevention
// ============================================================================

interface CircuitBreakerState {
	failureCount: number;
	lastFailureTime: number;
	isOpen: boolean;
	halfOpenAttempts: number;
}

interface FetchRetryOptions {
	timeoutMs?: number;
	maxRetries?: number;
}

class CircuitBreaker {
	private static instance: CircuitBreaker;
	private state: CircuitBreakerState = {
		failureCount: 0,
		lastFailureTime: 0,
		isOpen: false,
		halfOpenAttempts: 0,
	};
	private readonly FAILURE_THRESHOLD = 5;
	private readonly RESET_TIMEOUT_MS = 60000; // 1 minute
	private readonly HALF_OPEN_MAX_ATTEMPTS = 1;

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
		if (!this.state.isOpen) return false;
		
		// Check if we should transition to half-open state
		if (Date.now() - this.state.lastFailureTime > this.RESET_TIMEOUT_MS) {
			this.state.isOpen = false;
			this.state.halfOpenAttempts = 0;
			console.info("[CircuitBreaker] Closed. Resuming requests.");
			return false;
		}
		return true;
	}

	isHalfOpen(): boolean {
		return !this.state.isOpen && this.state.halfOpenAttempts > 0;
	}

	recordSuccess(): void {
		this.state.failureCount = 0;
		this.state.isOpen = false;
		this.state.halfOpenAttempts = 0;
	}
}

const circuitBreaker = CircuitBreaker.getInstance();

/**
 * Calculate exponential backoff with jitter
 */
function getExponentialBackoff(attempt: number): number {
	const exponential = BACKOFF_BASE_MS * Math.pow(2, attempt);
	const jitter = exponential * 0.2 * Math.random();
	return exponential + jitter;
}

interface RetryOptions extends FetchRetryOptions {
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
		const finalMaxRetries = maxRetries ?? MAX_RETRIES;
		const finalTimeoutMs = Math.min(Math.max(baseDelay ?? DEFAULT_TIMEOUT_MS, 1000), MAX_TIMEOUT_MS);
		let lastError: Error | null = null;

		// Check circuit breaker before attempting request
		if (enableCircuitBreaker && circuitBreaker.isOpen()) {
			const error = new Error(
				"[CircuitBreaker] Request rejected due to cascading failures. Service unavailable.",
			);
			console.error(error.message);
			throw error;
		}

		for (let attempt = 0; attempt <= finalMaxRetries; attempt++) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), finalTimeoutMs);
			
			try {
				const response = await baseFetch(input, {
					...init,
					signal: controller.signal,
				});
				clearTimeout(timeoutId);
				circuitBreaker.recordSuccess();

				// Retry on transient server errors
				if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < finalMaxRetries) {
					const delayWithJitter = getExponentialBackoff(attempt);
					console.warn(
						`[RetryWithBackoff] Attempt ${attempt + 1}/${finalMaxRetries + 1} failed (status ${response.status}). Retrying in ${Math.round(delayWithJitter)}ms.`,
					);
					await sleep(delayWithJitter);
					continue;
				}

				return response;
			} catch (error) {
				clearTimeout(timeoutId);
				lastError = error instanceof Error ? error : new Error(String(error));

				// Retry on network errors and timeouts
				if (attempt < finalMaxRetries) {
					const delayWithJitter = getExponentialBackoff(attempt);
					await sleep(delayWithJitter);
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
