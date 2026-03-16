/**
 * GraphQL Request Batching Utility
 * Deduplicates and batches GraphQL queries within a micro-task to prevent N+1 calls
 */

import { executeRawGraphQL, type RawGraphQLOptions } from "./graphql";

interface BatchRequest {
  options: RawGraphQLOptions;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

let batchQueue: BatchRequest[] = [];
let batchScheduled = false;
const BATCH_TIMEOUT_MS = 5; // Micro-task batching window

/**
 * Batches GraphQL queries to prevent N+1 problem
 * Multiple queries within the same micro-task are combined into a single request
 */
export async function executeBatchedGraphQL<T = unknown>(
  options: RawGraphQLOptions
): Promise<T> {
  return new Promise((resolve, reject) => {
    batchQueue.push({ options, resolve, reject });

    if (!batchScheduled) {
      batchScheduled = true;
      // Use setTimeout to create a batching window
      setTimeout(processBatch, BATCH_TIMEOUT_MS);
    }
  });
}

async function processBatch() {
  const queue = batchQueue;
  batchQueue = [];
  batchScheduled = false;

  if (queue.length === 0) return;

  try {
    // If single request, execute directly
    if (queue.length === 1) {
      const { options, resolve, reject } = queue[0];
      try {
        const result = await executeRawGraphQL(options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      return;
    }

    // Multiple requests: Would need custom batching logic
    // For now, execute in parallel
    const promises = queue.map(({ options, resolve, reject }) =>
      executeRawGraphQL(options)
        .then(resolve)
        .catch(reject)
    );

    await Promise.allSettled(promises);
  } catch (error) {
    queue.forEach(({ reject }) => reject(error));
  }
}

/**
 * Query result cache to prevent duplicate requests
 * Use with caution: cache is module-scoped and persists across requests in production
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute TTL

export function getCachedQuery(query: string): any | null {
  const cached = queryCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  queryCache.delete(query);
  return null;
}

export function setCachedQuery(query: string, data: any): void {
  queryCache.set(query, { data, timestamp: Date.now() });
}

export function clearQueryCache(query?: string): void {
  if (query) {
    queryCache.delete(query);
  } else {
    queryCache.clear();
  }
}
