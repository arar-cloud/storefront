import { useUserQuery, useApolloClient } from "@/checkout/graphql";
import { useMemo, useEffect, useApolloClient } from "react";

// Module-level cache for request deduplication
let cachedUserResult: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // Cache user data for 60 seconds

const isCacheValid = () => {
  return cachedUserResult !== null && (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
};

export const useUser = () => {
  const [{ data, fetching: loading, stale }] = useUserQuery();

  // Update cache when data changes
  useEffect(() => {
    if (data?.user && !loading) {
      cachedUserResult = data.user;
      cacheTimestamp = Date.now();
    }
  }, [data?.user, loading]);

  // Return cached data if valid to prevent unnecessary re-renders
  const user = isCacheValid() ? cachedUserResult : data?.user;
  const authenticated = !!user?.id;

	return { user, loading: loading || stale, authenticated };
};
