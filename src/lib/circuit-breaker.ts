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
  name?: string;
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

  async execute<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    // Check if we should attempt recovery
    if (this.state.state === CircuitState.OPEN) {
      if (
        this.state.nextAttemptTime &&
        Date.now() >= this.state.nextAttemptTime
      ) {
        this.state.state = CircuitState.HALF_OPEN;
        this.state.successes = 0;
      } else {
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. Retryable.`
        );
      }
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
