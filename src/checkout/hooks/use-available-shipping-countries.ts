import { useMemo } from "react";
import { type CountryCode, useChannelQuery } from "@/checkout/graphql";
import { useQuery } from "urql";
import { COUNTRIES_AND_VALIDATION_QUERY } from "@/checkout/graphql/queries";
import { useCheckout } from "@/checkout/hooks/use-checkout";

interface UseAvailableShippingCountries {
	availableShippingCountries: CountryCode[];
}

export const useAvailableShippingCountries = (): UseAvailableShippingCountries => {
	const { checkout } = useCheckout();
	const [{ data }] = useQuery(COUNTRIES_AND_VALIDATION_QUERY, {
		variables: useMemo(() => ({ channelSlug: checkout?.channel?.slug || "" }), [checkout?.channel?.slug]),
		pause: !checkout?.channel?.slug,
	});

	const availableShippingCountries: CountryCode[] = useMemo(
		() => (data?.channel?.countries?.map(({ code }) => code) as CountryCode[]) || [],
		[data?.channel?.countries],
	);

	return { availableShippingCountries };
};
