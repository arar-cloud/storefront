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

	const variables = useMemo(
		() => ({ id: id || "", languageCode: localeConfig.graphqlLanguageCode }),
		[id],
	);

	const [{ data, fetching, stale }, refetch] = useCheckoutQuery({
		variables,
		pause: shouldPause,
	});

	const memoizedRefetch = useCallback(refetch, [refetch]);

	return useMemo(
		() => ({
			checkout: data?.checkout as Checkout,
			fetching: fetching || stale,
			refetch: memoizedRefetch,
			hasCheckoutId: !!id,
		}),
		[data?.checkout, fetching, memoizedRefetch, stale, id],
	);
};
