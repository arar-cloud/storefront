import AdyenCheckout from "@adyen/adyen-web";
import { type FC, useCallback, useEffect, useRef } from "react";
import { z } from "zod";

/**
 * Sanitize error message to prevent XSS attacks
 * Removes any HTML tags and script content from error messages
 */
function sanitizeErrorMessage(message: string): string {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }
  // Remove HTML tags and dangerous content
  return message
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, 255); // Limit length to prevent DoS via long strings
}

import { createAdyenCheckoutConfig } from "@/checkout/sections/PaymentSection/AdyenDropIn/utils";
import {
	type AdyenDropinProps,
	useAdyenDropin,
} from "@/checkout/sections/PaymentSection/AdyenDropIn/useAdyenDropin";
import "@adyen/adyen-web/dist/adyen.css";
import { type AdyenGatewayInitializePayload } from "@/checkout/sections/PaymentSection/AdyenDropIn/types";

type AdyenCheckoutInstance = Awaited<ReturnType<typeof AdyenCheckout>>;

// fake function just to get the type because can't import it :(
const _hack = (adyenCheckout: AdyenCheckoutInstance) =>
	adyenCheckout.create("dropin").mount("#dropin-container");
type DropinElement = ReturnType<typeof _hack>;

/**
 * Validates payment form state to prevent injection and DoS attacks
 * Ensures all form data conforms to expected types and ranges
 */
function validatePaymentFormState(state: any): boolean {
  if (!state || typeof state !== 'object') {
    console.error('[SECURITY] Invalid payment state: not an object');
    return false;
  }

  // Validate payment method object structure
  if (!state.data || typeof state.data !== 'object') {
    console.error('[SECURITY] Invalid payment state: missing or invalid data field');
    return false;
  }

  // Prevent excessively large data objects (DoS protection)
  const dataString = JSON.stringify(state.data);
  if (dataString.length > 10000) {
    console.error('[SECURITY] Payment data exceeds maximum size limit');
    return false;
  }

  // Validate isValid flag type if present
  if ('isValid' in state && typeof state.isValid !== 'boolean') {
    console.error('[SECURITY] Invalid isValid flag type');
    return false;
  }

  return true;
}

/**
 * Input validation schema for payment form data
 * Prevents injection attacks and validates payment amounts
 */
const PaymentFormDataSchema = z.object({
  paymentMethod: z.object({}).strict().passthrough().refine(
    (data) => typeof data === 'object' && data !== null,
    'Invalid payment method data'
  ),
  amount: z.number().positive('Amount must be positive').finite('Invalid amount'),
  currency: z.string().length(3, 'Currency must be 3-letter code').regex(/^[A-Z]{3}$/, 'Invalid currency code'),
  reference: z.string().max(255, 'Reference too long').regex(/^[a-zA-Z0-9\-._]*$/, 'Invalid reference format'),
}).strict();

type PaymentFormData = z.infer<typeof PaymentFormDataSchema>;

export const AdyenDropIn: FC<AdyenDropinProps> = ({ config }) => {
	const { onSubmit, onAdditionalDetails } = useAdyenDropin({ config });
	const dropinContainerElRef = useRef<HTMLDivElement>(null);
	const dropinComponentRef = useRef<DropinElement | null>(null);

	const createAdyenCheckoutInstance = useCallback(
		async (container: HTMLDivElement, data: AdyenGatewayInitializePayload) => {
			const adyenCheckout = await AdyenCheckout(
				createAdyenCheckoutConfig({ ...data, onSubmit, onAdditionalDetails }),
			);

			dropinComponentRef.current?.unmount();

			const dropin = adyenCheckout.create("dropin").mount(container);

			dropinComponentRef.current = dropin;
		},
		[onAdditionalDetails, onSubmit],
	);

	useEffect(() => {
		if (dropinContainerElRef.current && !dropinComponentRef.current) {
			void createAdyenCheckoutInstance(dropinContainerElRef.current, config.data);
		}
	}, []);

	return (
		<div ref={dropinContainerElRef} />
	);
};
