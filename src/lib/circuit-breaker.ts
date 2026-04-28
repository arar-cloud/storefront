/**
 * Circuit breaker pattern implementation for external API calls (Adyen, etc.).
 * Prevents cascading failures by fast-failing when service is degraded.
 * States: CLOSED (normal) -> OPEN (fail-fast) -> HALF_OPEN (testing recovery)
 */

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
	/** Failure threshold before opening circuit (0-1) */
	failureThreshold?: number;
	/** Number of requests to track for failure rate */
	windowSize?: number;
	/** Time in ms before transitioning from OPEN to HALF_OPEN */
	timeoutMs?: number;
}

export class CircuitBreaker {
	private state: CircuitBreakerState = "CLOSED";
	private failureCount = 0;
	private requestCount = 0;
	private lastFailureTime = 0;
	private requests: boolean[] = []; // true = success, false = failure

	private readonly failureThreshold: number;
	private readonly windowSize: number;
	private readonly timeoutMs: number;

	constructor(config: CircuitBreakerConfig = {}) {
		this.failureThreshold = config.failureThreshold ?? 0.5; // 50% failure rate
		this.windowSize = config.windowSize ?? 10;
		this.timeoutMs = config.timeoutMs ?? 60000; // 1 minute timeout
	}

	getState(): CircuitBreakerState {
		return this.state;
	}

	/**
	 * Execute a function through the circuit breaker.
	 * Throws error immediately if circuit is OPEN.
	 */
	async execute<T>(
		fn: () => Promise<T>,
		name: string = "API call"
	): Promise<T> {
		// Check if we should attempt recovery from OPEN state
		if (this.state === "OPEN") {
			const timeSinceFailure = Date.now() - this.lastFailureTime;
			if (timeSinceFailure > this.timeoutMs) {
				this.state = "HALF_OPEN";
				console.warn("[CircuitBreaker] Transitioning to HALF_OPEN state for recovery test");
			} else {
				const remainingMs = this.timeoutMs - timeSinceFailure;
				throw new Error(
					`Service degraded (${name}). Circuit breaker OPEN. ` +
					`Retry in ${Math.ceil(remainingMs / 1000)}s.`
				);
			}
		}

		try {
			const result = await fn();
			this.recordSuccess();
			return result;
		} catch (error) {
			this.recordFailure();
			if (this.state === "OPEN") {
				console.error(
					`[CircuitBreaker] Circuit breaker OPEN for ${name}. ` +
					`Failure threshold exceeded. Fast-failing to prevent cascading failures.`
				);
			}
			throw error;
		}
	}

	private recordSuccess(): void {
		this.requests.push(true);
		if (this.requests.length > this.windowSize) {
			this.requests.shift();
		}

		if (this.state === "HALF_OPEN") {
			console.log("[CircuitBreaker] Service recovered. Closing circuit.");
			this.state = "CLOSED";
			this.requests = [];
		}
	}

	private recordFailure(): void {
		this.requests.push(false);
		this.lastFailureTime = Date.now();

		if (this.requests.length > this.windowSize) {
			this.requests.shift();
		}

		const failureRate = this.getFailureRate();
		if (failureRate > this.failureThreshold && this.state !== "OPEN") {
			console.error(
				`[CircuitBreaker] Failure rate ${(failureRate * 100).toFixed(1)}% ` +
				`exceeds threshold ${(this.failureThreshold * 100).toFixed(1)}%. Opening circuit.`
			);
			this.state = "OPEN";
		}
	}

	private getFailureRate(): number {
		if (this.requests.length === 0) return 0;
		const failures = this.requests.filter(success => !success).length;
		return failures / this.requests.length;
	}

	/**
	 * Reset circuit breaker to initial state (for testing or manual recovery).
	 */
	reset(): void {
		this.state = "CLOSED";
		this.requests = [];
		this.lastFailureTime = 0;
		console.log("[CircuitBreaker] Circuit breaker reset to CLOSED state");
	}
}
