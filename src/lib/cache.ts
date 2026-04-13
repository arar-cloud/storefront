/**
 * Redis caching layer for expensive computed fields and aggregations.
 * Prevents redundant database queries and computation on every request.
 */

const CACHE_TTL_DEFAULTS = {
  // Aggregations and computed fields
  productStats: 3600, // 1 hour
  categoryStats: 3600,
  orderStats: 1800, // 30 minutes
  userStats: 900, // 15 minutes
  // Hot data
  productDetails: 600, // 10 minutes
  categoryDetails: 600,
};

interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

class CacheManager {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private namespace: string = 'roaster';

  /**
   * Get cached value if not expired
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const cacheKey = this.buildKey(key, options?.namespace);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cache value with TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    options?: CacheOptions
  ): Promise<void> {
    const cacheKey = this.buildKey(key, options?.namespace);
    const ttl = ttlSeconds || CACHE_TTL_DEFAULTS.productDetails;
    const expiresAt = Date.now() + ttl * 1000;

    this.cache.set(cacheKey, { value, expiresAt });
  }

  /**
   * Invalidate cache by prefix pattern
   */
  async invalidate(pattern: string, options?: CacheOptions): Promise<void> {
    const prefix = this.buildKey(pattern, options?.namespace);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Compute and cache result only if not already cached
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds?: number,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) return cached;

    const result = await compute();
    await this.set(key, result, ttlSeconds, options);
    return result;
  }

  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}:${key}`;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

export { CACHE_TTL_DEFAULTS, CacheOptions };
