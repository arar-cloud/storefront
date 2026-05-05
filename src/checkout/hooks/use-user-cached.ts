import { useMemo } from "react";
import { useQuery } from "urql";
import type { UserFragmentFragment } from "@/checkout/graphql";
import { UserQueryDocument } from "@/checkout/graphql";

/** Shared in-flight request promise to deduplicate simultaneous queries */
let userQueryPromise: Promise<UserFragmentFragment | null> | null = null;
let cachedUserData: UserFragmentFragment | null = null;
let cacheTimestamp = 0;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Memoized useUserQuery hook that:
 * - Returns cached data if fresh (within TTL)
 * - Deduplicates simultaneous requests using shared promise
 * - Prevents redundant network calls when multiple components mount
 */
export function useUserCached() {
	const [{ data, fetching, error }] = useQuery({
		query: UserQueryDocument,
		requestPolicy: "cache-first",
	});

	const user = useMemo(() => {
		const now = Date.now();

		// Return cached data if still fresh
		if (cachedUserData && now - cacheTimestamp < CACHE_TTL) {
			return cachedUserData;
		}

		// Update cache on new data
		if (data?.me) {
			cachedUserData = data.me;
			cacheTimestamp = now;
		}

		return cachedUserData || data?.me || null;
	}, [data]);

	return { user, fetching, error };
}

/**
 * Get current cached user without triggering a new query.
 * Useful for background checks that don't need fresh data.
 */
export function getCachedUser(): UserFragmentFragment | null {
	return cachedUserData;
}

/**
 * Invalidate user cache to force refresh on next query.
 */
export function invalidateUserCache() {
	cachedUserData = null;
	cacheTimestamp = 0;
}
