/**
 * Lazy Loading Utilities for Performance Optimization
 * Provides patterns for deferring component loads and intersection observer usage
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for triggering lazy loading when element comes into view
 * @param options - IntersectionObserver options
 * @returns [ref, isInView] - Ref to attach to element, boolean indicating if element is in view
 */
export function useLazyLoad(options: IntersectionObserverInit = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        // Stop observing once element is in view for one-time load
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      ...options,
    });

    observer.observe(ref.current);

    // Cleanup: remove observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isInView] as const;
}

/**
 * Hook for debounced data fetching
 * @param fetchFn - Function to fetch data
 * @param deps - Dependencies that trigger fetch
 * @param delay - Debounce delay in ms
 * @returns Loading and error state
 */
export function useDebouncedFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList,
  delay: number = 300,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        await fetchFn();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    }, delay);

    // Cleanup: clear timeout on unmount or deps change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return { isLoading, error };
}

/**
 * Batch GraphQL queries to prevent N+1 calls
 * @param queries - Array of GraphQL query objects
 * @param fetcher - Function to execute batched queries
 * @returns Promise with results
 */
export async function batchGraphQLQueries<T>(
  queries: Array<{ query: string; variables?: Record<string, any> }>,
  fetcher: (query: string, variables?: Record<string, any>) => Promise<any>,
): Promise<T[]> {
  // Deduplicate identical queries
  const uniqueQueries = Array.from(
    new Map(
      queries.map(q => [JSON.stringify(q), q])
    ).values()
  );

  // Execute all queries in parallel
  const results = await Promise.all(
    uniqueQueries.map(q => fetcher(q.query, q.variables))
  );

  return results as T[];
}
