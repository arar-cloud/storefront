/**
 * GraphQL Query Deduplication and Caching
 * Prevents duplicate identical queries from being sent to the server
 * within a short time window (default 50ms)
 */

interface QueryCache {
  promise: Promise<any>;
  timestamp: number;
}

const queryCache = new Map<string, QueryCache>();
const CACHE_WINDOW_MS = 50; // Short window for request batching

/**
 * Get a cache key from a GraphQL query string
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Cache key
 */
export function getCacheKey(query: string, variables?: Record<string, any>): string {
  const variablesKey = variables ? JSON.stringify(variables) : '';
  return `${query}::${variablesKey}`;
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_WINDOW_MS) {
      queryCache.delete(key);
    }
  }
}

/**
 * Wrap a GraphQL fetch with deduplication
 * @param fetcher - Function that performs the actual fetch
 * @param query - GraphQL query
 * @param variables - Query variables
 * @returns Deduplicated promise
 */
export async function fetchWithDeduplication<T>(
  fetcher: () => Promise<T>,
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  clearExpiredCache();
  
  const cacheKey = getCacheKey(query, variables);
  const cachedEntry = queryCache.get(cacheKey);
  
  // Return cached promise if it exists and hasn't expired
  if (cachedEntry) {
    return cachedEntry.promise;
  }
  
  // Create new promise and cache it
  const promise = fetcher();
  queryCache.set(cacheKey, {
    promise,
    timestamp: Date.now(),
  });
  
  // Remove from cache after TTL
  setTimeout(() => {
    queryCache.delete(cacheKey);
  }, CACHE_WINDOW_MS);
  
  return promise;
}

/**
 * Clear all cached queries
 */
export function clearQueryCache(): void {
  queryCache.clear();
}
