import { useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";

import { type Checkout, useCheckoutQuery } from "@/checkout/graphql";
import { extractCheckoutIdFromParams, getQueryParams } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";

// Request deduplication cache: stores recent query results and timestamps
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 2000; // 2-second cache window

export const useCheckout = ({ pause = false } = {}) => {
	const searchParams = useSearchParams();
	const queryParams = useMemo(() => getQueryParams(searchParams), [searchParams]);
	const id = extractCheckoutIdFromParams(queryParams);
	const pendingRequestRef = useRef<Promise<any> | null>(null);

	// Pause the query if there's no checkout ID
	const shouldPause = pause || !id;

	const cacheKey = `checkout_${id}_${localeConfig.graphqlLanguageCode}`;
	const getCachedOrFetch = useCallback(() => {
		const now = Date.now();
		const cached = requestCache.get(cacheKey);
		// Return cached data if still fresh
		if (cached && now - cached.timestamp < CACHE_TTL_MS) {
			return Promise.resolve(cached.data);
		}
		// If a request is already pending, reuse it (deduplication)
		if (pendingRequestRef.current) {
			return pendingRequestRef.current;
		}
		return null;
	}, [cacheKey]);

	const [{ data, fetching, stale }, refetch] = useCheckoutQuery({
		variables: { id: id || "", languageCode: localeConfig.graphqlLanguageCode },
		pause: shouldPause,
	});

	return useMemo(
		() => ({
			checkout: data?.checkout as Checkout,
			fetching: fetching || stale,
			refetch,
			hasCheckoutId: !!id,
		}),
		[data?.checkout, fetching, refetch, stale, id],
	);
};
