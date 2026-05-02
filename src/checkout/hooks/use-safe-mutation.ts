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
