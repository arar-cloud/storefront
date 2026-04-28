/**
 * Complete Adyen SDK error response shape with type guards.
 * Prevents runtime failures from unexpected error structures.
 */
export interface AdyenError {
	errorCode?: string;
	resultCode?: string;
	message?: string;
	errorType?: string;
	detailErrorCode?: string;
	detailErrorMessage?: string;
	pspReference?: string;
	refusalReason?: string;
	refusalReasonCode?: string;
}

/**
 * Type guard to safely check if object is an AdyenError.
 */
export function isAdyenError(value: unknown): value is AdyenError {
	if (typeof value !== "object" || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.errorCode === "string" ||
		typeof obj.resultCode === "string" ||
		typeof obj.message === "string" ||
		typeof obj.errorType === "string"
	);
}

/**
 * Extract error code from Adyen error response with fallbacks.
 */
export function getAdyenErrorCode(error: unknown): string | undefined {
	if (!isAdyenError(error)) return undefined;
	return error.errorCode || error.resultCode || error.detailErrorCode;
}

import { type CardElementData } from "@adyen/adyen-web/dist/types/components/Card/types";
import type DropinElement from "@adyen/adyen-web/dist/types/components/Dropin";
import { type PaymentMethodsResponse } from "@adyen/adyen-web/dist/types/core/ProcessResponse/PaymentMethodsResponse/types";
import { type PaymentResponse } from "@adyen/adyen-web/dist/types/components/types";

export const adyenGatewayId = "app.saleor.adyen";
export type AdyenGatewayId = typeof adyenGatewayId;

// because it's defined to these in the docs but it's a string in the response type
type AdyenResultCode = "Authorised" | "Error" | "Pending" | "PresentToShopper" | "Refused" | "Received";

export interface AdyenGatewayInitializePayload {
	paymentMethodsResponse: PaymentMethodsResponse;
	clientKey: string;
	environment: string;
}

export interface AdyenPaymentResponse extends Omit<PaymentResponse, "resultCode"> {
	resultCode: AdyenResultCode;
	refusalReason?: string;
}

export interface AdyenTransactionInitializeResponse {
	paymentResponse: AdyenPaymentResponse;
}

export interface AdyenTransactionProcessResponse {
	paymentDetailsResponse: AdyenPaymentResponse;
}

// -------

export type ApplePayCallback = <T>(value: T) => void;

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
