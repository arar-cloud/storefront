import { useEffect, useRef } from "react";
import { type AnyVariables, type UseMutationResponse } from "urql";

/**
 * Run a mutation exactly once when conditions are met.
 * Useful for auto-triggered side effects (e.g., attach customer on login).
 * Resets when `deps` change. Network retry is handled by fetchRetry.ts.
 */

const handleMutationError = (error: any) => {
	console.error('[useSafeMutationOnce] Mutation error:', error);
	if (error?.graphQLErrors?.length > 0) {
		const firstError = error.graphQLErrors[0];
		return {
			type: 'graphql',
			message: firstError?.message || 'GraphQL error occurred',
			code: firstError?.extensions?.code,
		};
	}
	if (error?.networkError) {
		return {
			type: 'network',
			message: error.networkError.message || 'Network error occurred',
		};
	}
	return {
		type: 'unknown',
		message: error?.message || 'Unknown mutation error',
	};
};
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

	// Reset when deps change
	const depsKey = JSON.stringify(deps);
	useEffect(() => {
		hasRunRef.current = false;
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
				const parsedError = handleMutationError(error);
				onError?.(error instanceof Error ? error : new Error(String(error)));
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [skip, depsKey]);
}
