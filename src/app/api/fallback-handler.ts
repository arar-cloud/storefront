// Fallback and graceful degradation for external dependencies

export type FallbackStrategy<T> = () => T | Promise<T>;

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes before closing circuit
  timeout: number; // Timeout in milliseconds
  halfOpenTimeout: number; // Time before trying again after failure
}

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  errors: Array<{ timestamp: number; error: string }>;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 5000,
  halfOpenTimeout: 30000,
};

export function createFallbackHandler<T>(
  name: string,
  primaryFn: () => Promise<T>,
  fallbackFn: FallbackStrategy<T>,
  config: Partial<CircuitBreakerConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const breaker = getOrCreateBreaker(name);

  return async function executeWithFallback(): Promise<T> {
    // If circuit is open and enough time hasn't passed, use fallback immediately
    if (breaker.state === 'open') {
      if (
        breaker.lastFailureTime &&
        Date.now() - breaker.lastFailureTime < mergedConfig.halfOpenTimeout
      ) {
        return fallbackFn();
      }
      // Transition to half-open to try recovery
      breaker.state = 'half-open';
      breaker.successCount = 0;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${mergedConfig.timeout}ms`)),
          mergedConfig.timeout
        )
      );

      const result = await Promise.race([primaryFn(), timeoutPromise]);

      // Success: update breaker state
      if (breaker.state === 'half-open') {
        breaker.successCount += 1;
        if (breaker.successCount >= mergedConfig.successThreshold) {
          breaker.state = 'closed';
          breaker.failureCount = 0;
          breaker.successCount = 0;
        }
      } else if (breaker.state === 'closed') {
        breaker.failureCount = 0;
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Record error
      breaker.errors.push({
        timestamp: Date.now(),
        error: errorMsg,
      });
      breaker.errors = breaker.errors.slice(-20); // Keep last 20 errors
      breaker.lastFailureTime = Date.now();

      // Update failure count
      breaker.failureCount += 1;

      // Open circuit if threshold exceeded
      if (breaker.failureCount >= mergedConfig.failureThreshold) {
        breaker.state = 'open';
        console.warn(`[Fallback] Circuit breaker opened for ${name}`);
      }

      // Use fallback
      try {
        const fallbackResult = await fallbackFn();
        console.info(`[Fallback] Used fallback for ${name}`);
        return fallbackResult;
      } catch (fallbackError) {
        console.error(`[Fallback] Fallback also failed for ${name}:`, fallbackError);
        throw fallbackError;
      }
    }
  };
}

function getOrCreateBreaker(name: string): CircuitBreakerState {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      errors: [],
    });
  }
  return circuitBreakers.get(name)!;
}

export function resetCircuitBreaker(name: string): void {
  const breaker = getOrCreateBreaker(name);
  breaker.state = 'closed';
  breaker.failureCount = 0;
  breaker.successCount = 0;
  breaker.errors = [];
}

export function getCircuitBreakerStatus(name: string) {
  const breaker = getOrCreateBreaker(name);
  return {
    state: breaker.state,
    failureCount: breaker.failureCount,
    successCount: breaker.successCount,
    recentErrors: breaker.errors.slice(-5),
  };
}

export function getAllCircuitBreakerStatuses() {
  const statuses: Record<string, any> = {};
  for (const [name, breaker] of circuitBreakers.entries()) {
    statuses[name] = {
      state: breaker.state,
      failureCount: breaker.failureCount,
      errorCount: breaker.errors.length,
    };
  }
  return statuses;
}
