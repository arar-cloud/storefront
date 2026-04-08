// Rate limiting and backpressure handling for API stability

interface RateLimitConfig {
  tokensPerInterval: number;
  interval: number; // milliseconds
  maxQueueSize: number;
  name: string;
}

interface RateLimitState {
  tokens: number;
  lastRefill: number;
  queue: Array<() => void>;
  activeRequests: number;
  maxConcurrent: number;
}

const limiters = new Map<string, RateLimitState>();

const DEFAULT_CONFIG: RateLimitConfig = {
  tokensPerInterval: 100,
  interval: 1000,
  maxQueueSize: 500,
  name: 'default',
};

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const state: RateLimitState = {
    tokens: mergedConfig.tokensPerInterval,
    lastRefill: Date.now(),
    queue: [],
    activeRequests: 0,
    maxConcurrent: mergedConfig.tokensPerInterval * 2,
  };

  limiters.set(mergedConfig.name, state);

  return {
    async acquire(): Promise<void> {
      const state = limiters.get(mergedConfig.name);
      if (!state) throw new Error(`Rate limiter ${mergedConfig.name} not found`);

      // Refill tokens based on elapsed time
      const now = Date.now();
      const timeElapsed = now - state.lastRefill;
      const tokensToAdd = (timeElapsed / mergedConfig.interval) * mergedConfig.tokensPerInterval;

      state.tokens = Math.min(
        mergedConfig.tokensPerInterval,
        state.tokens + tokensToAdd
      );
      state.lastRefill = now;

      // Check if backpressure limit reached
      if (state.activeRequests >= state.maxConcurrent) {
        if (state.queue.length >= mergedConfig.maxQueueSize) {
          throw new Error('Service overloaded: queue full');
        }

        // Wait in queue
        await new Promise<void>((resolve) => {
          state.queue.push(resolve);
        });
        return this.acquire(); // Retry after queue was processed
      }

      // Consume token
      if (state.tokens < 1) {
        const waitTime = (mergedConfig.interval / mergedConfig.tokensPerInterval) * (1 - state.tokens);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.acquire(); // Retry after backoff
      }

      state.tokens -= 1;
      state.activeRequests += 1;
    },

    release(): void {
      const state = limiters.get(mergedConfig.name);
      if (!state) return;

      state.activeRequests -= 1;

      // Process waiting requests
      if (state.queue.length > 0) {
        const next = state.queue.shift();
        if (next) next();
      }
    },

    getStatus() {
      const state = limiters.get(mergedConfig.name);
      if (!state) return null;
      return {
        tokensAvailable: Math.floor(state.tokens),
        activeRequests: state.activeRequests,
        maxConcurrent: state.maxConcurrent,
        queueLength: state.queue.length,
        maxQueueSize: mergedConfig.maxQueueSize,
      };
    },
  };
}

export function resetLimiter(name: string = 'default'): void {
  limiters.delete(name);
}

export function getAllLimitersStatus() {
  const status: Record<string, any> = {};
  for (const [name, state] of limiters.entries()) {
    status[name] = {
      tokensAvailable: Math.floor(state.tokens),
      activeRequests: state.activeRequests,
      queueLength: state.queue.length,
    };
  }
  return status;
}
