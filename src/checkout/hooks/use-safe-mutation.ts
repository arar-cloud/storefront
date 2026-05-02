// Exponential backoff configuration for retry logic
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

const exponentialBackoffRetry = async <T>(
  fn: () => Promise<T>,
  config = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Only retry on transient errors (network, timeout, 5xx)
      const isTransient =
        errorMessage.includes('network') ||
        erroMMessage.includes('503') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('timeout') ||
         error.message.includes('504');

      if (!isTransient) {
        throw error;
      }

      // Calculate delay with exponential backoff, capped at maxDelayMs
      const delayMs = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delayMs + jitter));
    }
  }
  throw lastError;
};

import { useEffect, useRef, useCallback } from "react";
import { type AnyVariables, type UseMutationResponse } from "urql";

/**
 * Shallow compare two dependency arrays to avoid string serialization overhead.
 * Returns true if arrays have same length and all elements are strictly equal.
 */
function areDepsEqual(prevDeps: unknown[], nextDeps: unknown[]): boolean {
	if (prevDeps.length !== nextDeps.length) return false;
	for (let i = 0; i < prevDeps.length; i++) {
		if (prevDeps[i] !== nextDeps[i]) return false;
	}
	return true;
}

/**
 * Run a mutation exactly once when conditions are met.
 * Useful for auto-triggered side effects (e.g., attach customer on login).
 * Resets when `deps` change. Network retry is handled by fetchRetry.ts.
 */
export function useSafeMutationOnce<TData, TVariables extends AnyVariables>(
	mutation: UseMutationResponse<TData, TVariables>[1],
	variables: TVariables,
	options: {
		/** Skip the mutation if true */
		skip?: boolean;
		/** Reset "hasRun" when these values change */
		deps?: unknown[];
		onSuccess?: (data: TData) => void;
		onError?: (error: Error) => void;
	} = {},
) {
	const { skip = false, deps = [], onSuccess, onError } = options;
	const hasRunRef = useRef(false);
	const prevDepsRef = useRef<unknown[] | null>(null);

	useEffect(() => {
		if (skip) {
			return;
		}

		const depsChanged = prevDepsRef.current === null || !areDepsEqual(prevDepsRef.current, deps);
		prevDepsRef.current = deps;

		if (depsChanged) {
			hasRunRef.current = false;
		}

		if (hasRunRef.current) {
			return;
		}

		hasRunRef.current = true;
		mutation(variables)
			.then((result) => {
				if (result.data) {
					onSuccess?.(result.data);
				}
				if (result.error) {
					onError?.(result.error);
				}
			})
			.catch((error) => {
				onError?.(error as Error);
			});
	}, deps);
}
