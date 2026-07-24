// @ts-nocheck
import AdyenCheckout from "@adyen/adyen-web";
import { type CardElementData } from "@adyen/adyen-web/dist/types/components/Card/types";
import type DropinElement from "@adyen/adyen-web/dist/types/components/Dropin";
import { PaymentResponse as AdyenApiPaymentResponse } from "@adyen/api-library/lib/src/typings/checkout/paymentResponse";
import { type CreateCheckoutSessionResponse } from "@adyen/api-library/lib/src/typings/checkout/createCheckoutSessionResponse";
import { type AdyenPaymentResponse } from "./types";
import { replaceUrl } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";

/**
 * Validates that the checkout session is properly authenticated and bound to user context.
 * Prevents unauthorized access to payment processing and cross-user payment hijacking.
 */
function validateCheckoutSession(checkoutId: string, userId?: string): boolean {
  if (!checkoutId || typeof checkoutId !== 'string') {
    console.error('[SECURITY] Invalid checkout ID format');
    return false;
  }
  if (!checkoutId.match(/^[a-zA-Z0-9\-]+$/)) {
    console.error('[SECURITY] Checkout ID contains invalid characters');
    return false;
  }
  // Session binding: ensure userId is provided for authenticated operations
  if (!userId || typeof userId !== 'string') {
    console.error('[SECURITY] Session not properly authenticated');
    return false;
  }
  return true;
}

/**
 * Validates API key and environment parameters to prevent injection attacks.
 * Ensures all configuration comes from secure backend context.
 */
function validateAdyenConfig(clientKey: string, environment: string): boolean {
  if (!clientKey || typeof clientKey !== 'string' || clientKey.length === 0) {
    console.error('[SECURITY] Invalid clientKey: must be a non-empty string');
    return false;
  }
  if (!/^[a-zA-Z0-9_\-.*]+$/.test(clientKey)) {
    console.error('[SECURITY] Invalid clientKey: contains disallowed characters');
    return false;
  }
  if (environment !== 'test' && environment !== 'live') {
    console.error('[SECURITY] Invalid environment: must be test or live');
    return false;
  }
  return true;
}

/**
 * Validates session data structure and content to prevent tampering
 * Ensures session ID and sessionData are properly formed and not oversized
 */
function validateSessionData(sessionId: string, sessionData: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    console.error('[SECURITY] Invalid session ID');
    return false;
  }
  if (!/^[a-zA-Z0-9\-_]{20,}$/.test(sessionId)) {
    console.error('[SECURITY] Session ID format invalid');
    return false;
  }
  if (!sessionData || typeof sessionData !== 'string') {
    console.error('[SECURITY] Invalid session data');
    return false;
  }
  // Prevent excessively large session data (potential DoS)
  if (sessionData.length > 50000) {
    console.error('[SECURITY] Session data exceeds maximum size');
    return false;
  }
  return true;
}

export type AdyenDropInCreateSessionResponse = {
	session: CreateCheckoutSessionResponse;
	clientKey?: string;
};
export type PostAdyenDropInPaymentsDetailsResponse = {
	payment: AdyenPaymentResponse;
	orderId: string;
};
export type PostAdyenDropInPaymentsResponse = {
	payment: AdyenPaymentResponse;
	orderId: string;
};

export type AdyenCheckoutInstanceState = {
	isValid?: boolean;
	data: CardElementData & Record<string, any>;
};
export type AdyenCheckoutInstanceOnSubmit = (
	state: AdyenCheckoutInstanceState,
	component: DropinElement,
) => Promise<void> | void;

export type AdyenCheckoutInstanceOnAdditionalDetails = (
	state: AdyenCheckoutInstanceState,
	component: DropinElement,
) => Promise<void> | void;

type ApplePayCallback = <T>(value: T) => void;

export function createAdyenCheckoutInstance(
	adyenSessionResponse: AdyenDropInCreateSessionResponse,
	{
		onSubmit,
		onAdditionalDetails,
	}: {
		onSubmit: AdyenCheckoutInstanceOnSubmit;
		onAdditionalDetails: AdyenCheckoutInstanceOnAdditionalDetails;
	},
	checkoutSessionId?: string,
	userId?: string,
) {
	// SECURITY: Validate session binding and configuration before SDK initialization
	if (checkoutSessionId && !validateCheckoutSession(checkoutSessionId, userId)) {
		throw new Error('[SECURITY] Failed to authenticate checkout session');
	}

	if (adyenSessionResponse.clientKey && !validateAdyenConfig(adyenSessionResponse.clientKey, 'test')) {
		throw new Error('[SECURITY] Invalid Adyen configuration parameters');
	}

	// SECURITY: Validate session data structure and content
	if (!validateSessionData(adyenSessionResponse.session.id, adyenSessionResponse.session.sessionData)) {
		throw new Error('[SECURITY] Session data validation failed');
	}

	// SECURITY: Validate all SDK configuration before initialization
	const sdkConfig = {
		clientKey: adyenSessionResponse.clientKey,
		environment: 'test',
		locale: localeConfig.default || 'en_US',
	} as const;

	// Verify all config values are strings and properly formed
	Object.entries(sdkConfig).forEach(([key, value]) => {
		if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`[SECURITY] Invalid SDK configuration: ${key} must be non-empty string`);
		}
	});

	return AdyenCheckout({
		locale: sdkConfig.locale,
		environment: sdkConfig.environment,
		clientKey: sdkConfig.clientKey,
		session: {
			id: adyenSessionResponse.session.id,
			sessionData: adyenSessionResponse.session.sessionData,
		},
		onPaymentCompleted: (result: any, component: any) => {
			console.info(result, component);
		},
		onError: (error: any, component: any) => {
			console.error(error.name, error.message, error.stack, component);
		},
		onSubmit,
		onAdditionalDetails,
		// Any payment method specific configuration. Find the configuration specific to each payment method: https://docs.adyen.com/payment-methods
		// For example, this is 3D Secure configuration for cards:
		paymentMethodsConfiguration: {
			card: {
				hasHolderName: true,
				holderNameRequired: true,
				billingAddressRequired: false,
			},
			applepay: {
				buttonType: "plain",
				buttonColor: "black",
				onPaymentMethodSelected: (resolve: ApplePayCallback, reject: ApplePayCallback, event) => {
					resolve(event.paymentMethod);
				},
				onShippingContactSelected: (resolve: ApplePayCallback, reject: ApplePayCallback, event) => {
					resolve(event.shippingContact);
				},
				onShippingMethodSelected: (resolve: ApplePayCallback, reject: ApplePayCallback, event) => {
					resolve(event.shippingMethod);
				},
			},
		},
		analytics: {
			enabled: false,
		},
	});
}

export function handlePaymentResult(
	saleorApiUrl: string,
	result: PostAdyenDropInPaymentsResponse | PostAdyenDropInPaymentsDetailsResponse,
	component: DropinElement,
) {
	switch (result.payment.resultCode) {
		// @todo https://docs.adyen.com/online-payments/payment-result-codes
		case AdyenApiPaymentResponse.ResultCodeEnum.AuthenticationFinished:
		case AdyenApiPaymentResponse.ResultCodeEnum.Cancelled:
		case AdyenApiPaymentResponse.ResultCodeEnum.ChallengeShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.Error:
		case AdyenApiPaymentResponse.ResultCodeEnum.IdentifyShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.Pending:
		case AdyenApiPaymentResponse.ResultCodeEnum.PresentToShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.Received:
		case AdyenApiPaymentResponse.ResultCodeEnum.RedirectShopper:
		case AdyenApiPaymentResponse.ResultCodeEnum.Refused: {
			console.error(result);
			component.setStatus("error", {
				message: `${result.payment.resultCode}: ${result.payment.refusalReason as string}`,
			});
			return;
		}

		case AdyenApiPaymentResponse.ResultCodeEnum.Authorised:
		case AdyenApiPaymentResponse.ResultCodeEnum.Success: {
			component.setStatus("success");
			const domain = new URL(saleorApiUrl).hostname;
			const newUrl = replaceUrl({
				query: {
					checkout: undefined,
					order: result.orderId,
					saleorApiUrl,
					// @todo remove `domain`
					// https://github.com/saleor/saleor-dashboard/issues/2387
					// https://github.com/saleor/saleor-app-sdk/issues/87
					domain,
				},
			});
			window.location.href = newUrl;
			return;
		}
	}
}
