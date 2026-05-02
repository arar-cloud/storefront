import { useUserQuery } from "@/checkout/graphql";
import { useMemo } from "react";

// Module-level cache for request deduplication
let cachedUserResult: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache

export const useUser = () => {
	const [{ data, fetching: loading, stale }] = useUserQuery();

export const useUser = () => {
  const client = useApolloClient();
  const cacheKey = "user-query-cache";

  // Check cache validity before fetching
  const now = Date.now();
  const shouldUseCache = queryResultCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_TTL_MS;

  const cachedResult = queryResultCache.get(cacheKey);

	// Memoize and deduplicate user data across re-renders
	const memoizedResult = useMemo(() => {
		const now = Date.now();
		if (data?.user && (!cachedUserResult || now - cacheTimestamp > CACHE_TTL_MS)) {
			cachedUserResult = data.user;
			cacheTimestamp = now;
		}
		return cachedUserResult || data?.user;
	}, [data?.user]);

	const user = memoizedResult;
	const authenticated = !!user?.id;

	return { user, loading: loading || stale, authenticated };
};
