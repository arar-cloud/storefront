/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when calling external services
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Failures before opening
  successThreshold?: number; // Successes before closing from half-open
  timeout?: number; // Time in ms before attempting recovery
  halfOpenTimeout?: number; // Max time to stay in half-open state
  name?: string;
  onStateChange?: (from: CircuitState, to: CircuitState) => void; // State transition callback
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

class CircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;
  private name: string;

  constructor(config: CircuitBreakerConfig = {}) {
    this.name = config.name || 'CircuitBreaker';
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 1 minute
      halfOpenTimeout: config.halfOpenTimeout ?? 30000, // 30 seconds max in half-open
      name: this.name,
    };

    this.state = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
    };
  }

  private transitionState(newState: CircuitState): void {
    if (this.state.state !== newState) {
      const oldState = this.state.state;
      this.state.state = newState;
      if (this.config.onStateChange) {
        this.config.onStateChange(oldState, newState);
      }
    }
  }

  private isHalfOpenExpired(): boolean {
    if (this.state.state !== CircuitState.HALF_OPEN) return false;
    if (!this.state.lastFailureTime) return false;
    return Date.now() - this.state.lastFailureTime > (this.config.halfOpenTimeout || 30000);
  }

  async execute<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    // Check if we should attempt recovery
    if (this.state.state === CircuitState.OPEN) {
      if (
        this.state.nextAttemptTime &&
        Date.now() >= this.state.nextAttemptTime
      ) {
        this.transitionState(CircuitState.HALF_OPEN);
        this.state.successes = 0;
      } else {
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. Retryable.`
        );
      }
    }

    // Force back to OPEN if half-open timeout expires
    if (this.isHalfOpenExpired()) {
      this.transitionState(CircuitState.OPEN);
      this.state.nextAttemptTime = Date.now() + this.config.timeout;
      throw new Error(`Circuit breaker ${this.name} half-open timeout expired.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;

    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.successes++;
      if (this.state.successes >= this.config.successThreshold) {
        this.state.state = CircuitState.CLOSED;
        this.state.successes = 0;
      }
    }
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.state = CircuitState.OPEN;
      this.state.nextAttemptTime = Date.now() + this.config.timeout;
    } else if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = CircuitState.OPEN;
      this.state.nextAttemptTime = Date.now() + this.config.timeout;
    }
  }

  getState(): CircuitState {
    return this.state.state;
  }

  reset(): void {
    this.state = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
    };
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getOrCreateCircuitBreaker(
  name: string,
  config?: CircuitBreakerConfig
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ ...config, name }));
  }
  return circuitBreakers.get(name)!;
}

export async function executeWithCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config?: CircuitBreakerConfig
): Promise<T> {
  const breaker = getOrCreateCircuitBreaker(name, config);
  return breaker.execute(fn);
}
