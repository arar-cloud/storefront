interface CheckoutCache {
  data: any;
  timestamp: number;
  ttl: number;
}

const checkoutCache = new Map<string, CheckoutCache>();

import * as React from "react";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { type Checkout, useCheckoutQuery } from "@/checkout/graphql";
import { extractCheckoutIdFromParams, getQueryParams } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";

export const useCheckout = ({ pause = false } = {}) => {
	const searchParams = useSearchParams();
	const queryParams = useMemo(() => getQueryParams(searchParams), [searchParams]);
	const id = extractCheckoutIdFromParams(queryParams);

	// Pause the query if there's no checkout ID
	const shouldPause = pause || !id;
	
	// Track mounted state to prevent memory leaks from subscriptions/timers
	const isMountedRef = React.useRef(true);

	const [{ data, fetching, stale }, refetch] = useCheckoutQuery({
		variables: { id: id || "", languageCode: localeConfig.graphqlLanguageCode },
		pause: shouldPause,
	});

	React.useEffect(() => {
		return () => {
			// Cleanup: mark component as unmounted to prevent state updates
			isMountedRef.current = false;
		};
	}, []);

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
