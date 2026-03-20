import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { type Checkout, useCheckoutQuery } from "@/checkout/graphql";
import { extractCheckoutIdFromParams, getQueryParams } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";

// State consistency guards for checkout operations
function validateCheckoutState(checkout: unknown): boolean {
	if (!checkout || typeof checkout !== "object") {
		return false;
	}
	const checkoutObj = checkout as Record<string, unknown>;
	if (typeof checkoutObj.id !== "string" || !checkoutObj.id) {
		console.warn("[Checkout] Invalid checkout ID");
		return false;
	}
	if (checkoutObj.lines !== undefined && !Array.isArray(checkoutObj.lines)) {
		console.warn("[Checkout] Invalid checkout lines");
		return false;
	}
	return true;
}

export const useCheckout = ({ pause = false } = {}) => {
	const searchParams = useSearchParams();
	const queryParams = useMemo(() => getQueryParams(searchParams), [searchParams]);
	const id = extractCheckoutIdFromParams(queryParams);

	// Pause the query if there's no checkout ID
	const shouldPause = pause || !id;

	const [{ data, fetching, stale }, refetch] = useCheckoutQuery({
		variables: { id: id || "", languageCode: localeConfig.graphqlLanguageCode },
		pause: shouldPause,
	});

	return useMemo(
		() => {
			const checkout = data?.checkout as Checkout;
			// Validate state consistency before returning
			if (checkout && !validateCheckoutState(checkout)) {
				console.error("[Checkout] State invariant violation detected");
			}
			return {
				checkout,
				fetching: fetching || stale,
				refetch,
				hasCheckoutId: !!id,
			};
		},
		[data?.checkout, fetching, refetch, stale, id],
	);
};
