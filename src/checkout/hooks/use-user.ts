import { useUserQuery } from "@/checkout/graphql";

export const useUser = () => {
	const [{ data, fetching: loading, stale }] = useUserQuery();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache
let cacheTimestamp = 0;

export const useUser = () => {
  const client = useApolloClient();
  const cacheKey = "user-query-cache";

  // Check cache validity before fetching
  const now = Date.now();
  const shouldUseCache = queryResultCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_TTL_MS;

  const cachedResult = queryResultCache.get(cacheKey);

	const user = data?.user;

	const authenticated = !!user?.id;

	return { user, loading: loading || stale, authenticated };
};
