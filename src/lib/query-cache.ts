/**
 * Query result caching layer to prevent N+1 and duplicate GraphQL calls.
 * Memoizes query results with configurable TTL.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 60000; // 60 seconds

export function getCacheKey(...args: any[]): string {
  return JSON.stringify(args);
}

export function setQueryCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export function getQueryCache<T>(key: string): T | null {
  const entry = queryCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    queryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function clearQueryCache(pattern?: RegExp): void {
  if (!pattern) {
    queryCache.clear();
    return;
  }

  for (const key of queryCache.keys()) {
    if (pattern.test(key)) {
      queryCache.delete(key);
    }
  }
}

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = getQueryCache<T>(key);
  if (cached) {
    return cached;
  }

  const data = await queryFn();
  setQueryCache(key, data, ttl);
  return data;
}
