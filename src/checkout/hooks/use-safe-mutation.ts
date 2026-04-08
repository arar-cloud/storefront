import { useEffect, useRef } from "react";
import { type AnyVariables, type UseMutationResponse } from "urql";

// ============================================================================
// Cache Invalidation Strategy with TTL
// ============================================================================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttlMs: number;
}

class MutationCacheManager {
	private static instance: MutationCacheManager;
	private cache = new Map<string, CacheEntry<unknown>>();

	private constructor() {}

	static getInstance(): MutationCacheManager {
		if (!MutationCacheManager.instance) {
			MutationCacheManager.instance = new MutationCacheManager();
		}
		return MutationCacheManager.instance;
	}

	set<T>(key: string, data: T, ttlMs: number = 300000): void {
		this.cache.set(key, { data, timestamp: Date.now(), ttlMs });
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (!entry) return null;

		const age = Date.now() - entry.timestamp;
		if (age > entry.ttlMs) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	invalidate(key: string): void {
		this.cache.delete(key);
	}

	invalidateByPattern(pattern: string): void {
		const regex = new RegExp(pattern);
		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
			}
		}
	}

	clear(): void {
		this.cache.clear();
	}
}

const cacheManager = MutationCacheManager.getInstance();

/**
 * Run a mutation exactly once when conditions are met.
 * Useful for auto-triggered side effects (e.g., attach customer on login).
 * Resets when `deps` change. Network retry is handled by fetchRetry.ts.
 * Includes cache invalidation and TTL enforcement to prevent stale state.
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
	const mutationCacheKey = useRef(`mutation_${Math.random()}`);

	// Reset when deps change
	const depsKey = JSON.stringify(deps);
	useEffect(() => {
		hasRunRef.current = false;
		// Invalidate cached mutation results when dependencies change
		cacheManager.invalidate(mutationCacheKey.current);
	}, [depsKey]);

	// Run mutation once
	useEffect(() => {
		if (skip || hasRunRef.current) return;
		hasRunRef.current = true;

		mutation(variables)
			.then((result) => {
				if (result.error) {
					onError?.(result.error);
				} else if (result.data) {
					onSuccess?.(result.data);
				}
			})
			.catch((error) => {
				onError?.(error instanceof Error ? error : new Error(String(error)));
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [skip, depsKey]);
}
