import { useEffect, useRef } from "react";
import { type AnyVariables, type UseMutationResponse } from "urql";

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
		/** Enable retry on transient failures */
		enableRetry?: boolean;
		maxRetries?: number;
	} = {},
) {
	const { skip = false, deps = [] } = options;
	const hasRunRef = useRef(false);

	// Reset when deps change
	const depsKey = JSON.stringify(deps);
	useEffect(() => {
		hasRunRef.current = false;
	}, [depsKey]);

	// Run mutation once with transient error retry capability
	useEffect(() => {
		if (skip || hasRunRef.current) return;
		hasRunRef.current = true;

		const { enableRetry = false, maxRetries = 2 } = options;
		let retryCount = 0;

		const executeMutation = (): void => {
			mutation(variables)
				.then((result) => {
					if (result.error) {
						const error = result.error instanceof Error ? result.error : new Error(String(result.error));
						// Retry on transient errors if enabled
						if (enableRetry && retryCount < maxRetries && isTransientError(error)) {
							retryCount++;
							const delay = Math.min(500 * Math.pow(2, retryCount - 1), 5000);
							setTimeout(executeMutation, delay);
						} else {
							onError?.(error);
						}
					} else if (result.data) {
						onSuccess?.(result.data);
					}
				})
				.catch((error) => {
					console.error("[useSafeMutationOnce] Unhandled mutation error:", error);
					onError?.(error instanceof Error ? error : new Error(String(error)));
				});
		};

		executeMutation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [skip, depsKey]);
}
