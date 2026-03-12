import { useMemo } from "react";
import { type CountryCode, useChannelQuery } from "@/checkout/graphql";
import { useCheckout } from "@/checkout/hooks/use-checkout";

interface UseAvailableShippingCountries {
	availableShippingCountries: CountryCode[];
}

export const useAvailableShippingCountries = (): UseAvailableShippingCountries => {
	const { checkout } = useCheckout();
	const [{ data }] = useChannelQuery({
		variables: { slug: checkout?.channel?.slug || "" },
		pause: !checkout?.channel?.slug,
	});

	// Memoize country filtering with optimized dependency array to prevent redundant
	// re-computation and avoid unnecessary re-renders in address forms
	const availableShippingCountries: CountryCode[] = useMemo(
		() => (data?.channel?.countries?.map(({ code }) => code) as CountryCode[]) || [],
		[data?.channel?.countries?.length, data?.channel?.countries?.[0]?.code],
	);

	return { availableShippingCountries };
};
