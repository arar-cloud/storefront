/**
 * Whitelist of allowed redirect domains for checkout confirmation.
 * Add your trusted fulfillment and post-purchase domains here.
 */
const ALLOWED_REDIRECT_DOMAINS = new Set([
  // Add production domains
  process.env.NEXT_PUBLIC_STOREFRONT_URL || '',
  // Add trusted fulfillment/analytics domains if needed
]);

/**
 * Validate and sanitize URL before redirect.
 * Prevents open redirect attacks and phishing vulnerabilities.
 */
export function validateRedirectUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;

    // Whitelist validation: only allow configured domains
    const isAllowed = Array.from(ALLOWED_REDIRECT_DOMAINS).some(
      (domain) => domain && origin.includes(domain),
    );

    if (!isAllowed) {
      console.warn('[URLValidation] Blocked redirect to unauthorized domain:', origin);
      return null;
    }

    // Additional security: reject javascript: protocol
    if (parsedUrl.protocol === 'javascript:') {
      console.warn('[URLValidation] Blocked javascript: protocol redirect');
      return null;
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.warn('[URLValidation] Blocked non-HTTP redirect protocol:', parsedUrl.protocol);
      return null;
    }

    return parsedUrl.href;
  } catch (error) {
    console.warn('[URLValidation] Invalid redirect URL:', url, error);
    return null;
  }
}

/**
 * Add domain to redirect whitelist at runtime.
 */
export function addAllowedRedirectDomain(domain: string): void {
  try {
    new URL(`https://${domain}`); // Validate domain format
    ALLOWED_REDIRECT_DOMAINS.add(domain);
  } catch (error) {
    console.error('[URLValidation] Invalid domain format:', domain);
  }
}

import { type CountryCode } from "@/checkout/graphql";
import { type MightNotExist } from "@/checkout/lib/global-types";
import { type ReadonlyURLSearchParams } from "next/navigation";

export type ParamBasicValue = MightNotExist<string>;

/**
 * Maps URL param names to internal names.
 * URL uses shorter/external names, internal code uses descriptive names.
 */
const queryParamsMap = {
	redirectUrl: "redirectUrl",
	checkout: "checkoutId",
	order: "orderId",
	token: "passwordResetToken",
	email: "passwordResetEmail",
	saleorApiUrl: "saleorApiUrl",
	// payment flow
	transaction: "transaction",
	processingPayment: "processingPayment",
	// adyen
	redirectResult: "redirectResult",
	resultCode: "resultCode",
	type: "type",
	// stripe
	payment_intent: "paymentIntent",
	payment_intent_client_secret: "paymentIntentClientSecret",
	// flow
	step: "step",
} as const;

type UnmappedQueryParam = keyof typeof queryParamsMap;

type QueryParam = (typeof queryParamsMap)[UnmappedQueryParam];

interface CustomTypedQueryParams {
	countryCode: CountryCode;
	channel: string;
	saleorApiUrl: string;
}

export type QueryParams = Record<QueryParam, ParamBasicValue> & CustomTypedQueryParams;

/**
 * Get query params with mapped names from Next.js ReadonlyURLSearchParams.
 */
export const getQueryParams = (searchParams: ReadonlyURLSearchParams): QueryParams => {
	const result: Record<string, string | undefined> = {};

	for (const [key, value] of searchParams.entries()) {
		if (key in queryParamsMap) {
			const mappedKey = queryParamsMap[key as UnmappedQueryParam];
			result[mappedKey] = value;
		}
	}

	return result as unknown as QueryParams;
};

/**
 * Create a new URLSearchParams string with updated values.
 * Useful for router.push() or router.replace().
 */
export const createQueryString = (
	currentParams: ReadonlyURLSearchParams,
	updates: Record<string, string | null>,
): string => {
	const params = new URLSearchParams(currentParams.toString());

	// Reverse map internal keys to URL keys
	const internalToUrlKey = Object.entries(queryParamsMap).reduce(
		(acc, [urlKey, internalKey]) => {
			acc[internalKey] = urlKey;
			return acc;
		},
		{} as Record<string, string>,
	);

	for (const [internalKey, value] of Object.entries(updates)) {
		const urlKey = internalToUrlKey[internalKey];
		if (!urlKey) continue;

		if (value === null) {
			params.delete(urlKey);
		} else {
			params.set(urlKey, value);
		}
	}

	return params.toString();
};

/**
 * Extract checkout ID from params.
 * Returns null if on order confirmation page.
 */
export const extractCheckoutIdFromParams = (params: QueryParams): string | null => {
	if (params.orderId) {
		return null;
	}

	if (typeof params.checkoutId !== "string") {
		return null;
	}

	return params.checkoutId;
};
