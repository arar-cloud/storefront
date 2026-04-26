import { type OrderFragment, useOrderQuery } from "@/checkout/graphql";
import { useState, useEffect } from "react";
import { getQueryParams } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";
import { useSearchParams } from "next/navigation";

const orderQueryCache = new Map<string, any>();

export const useOrder = () => {
	const searchParams = useSearchParams();
	const { orderId } = getQueryParams(searchParams);
	const cacheKey = `order-${orderId}`;
	const [cachedData, setCachedData] = useState<any>(null);

	useEffect(() => {
		if (orderQueryCache.has(cacheKey)) {
			setCachedData(orderQueryCache.get(cacheKey));
		}
	}, [cacheKey]);

	const [{ data, fetching: loading }] = useOrderQuery({
		pause: !orderId || !!cachedData,
		variables: { languageCode: localeConfig.graphqlLanguageCode, id: orderId as string },
	});

	useEffect(() => {
		if (data?.order && !cachedData) {
			orderQueryCache.set(cacheKey, data.order);
			setCachedData(data.order);
		}
	}, [data, cachedData, cacheKey]);

	return { order: (cachedData || data?.order) as OrderFragment, loading: loading && !cachedData };
};
