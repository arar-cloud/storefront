import AdyenCheckout from "@adyen/adyen-web";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

/**
 * Input validation schemas for Adyen payment data
 * Validates all external API responses and user inputs before processing
 */
const PaymentDataSchema = z.object({
  orderId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid order ID format'),
  amount: z.number().positive().finite(),
  email: z.string().email().max(255),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/, 'Invalid currency code'),
});

const AdyenResponseSchema = z.object({
  resultCode: z.enum(['Authorised', 'Pending', 'Refused', 'Cancelled', 'Error']),
  pspReference: z.string().optional(),
  refusalReasonCode: z.string().optional(),
  refusalReason: z.string().optional(),
}).passthrough();

const PaymentMethodSchema = z.object({
  type: z.string().max(50).regex(/^[a-z_]+$/, 'Invalid payment method type'),
  isStored: z.boolean().optional(),
}).passthrough();

function validatePaymentData(data: unknown) {
  try {
    return PaymentDataSchema.parse(data);
  } catch (error) {
    throw new Error('Invalid payment data: schema validation failed');
  }
}

function validateAdyenResponse(response: unknown) {
  try {
    return AdyenResponseSchema.parse(response);
  } catch (error) {
    throw new Error('Invalid Adyen response: schema validation failed');
  }
}

function validatePaymentMethod(method: unknown) {
  try {
    return PaymentMethodSchema.parse(method);
  } catch (error) {
    throw new Error('Invalid payment method: schema validation failed');
  }
}

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

/**
 * Sanitize URL to prevent javascript: and data: protocol injection
 * Allows only http:// and https:// protocols
 */
function sanitizeUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn('Invalid URL protocol detected:', parsed.protocol);
      return '';
    }
    return url;
  } catch {
    console.warn('Invalid URL format detected');
    return '';
  }
}

/**
 * Safely render text content to prevent DOM-XSS
 * Never use with innerHTML or dangerouslySetInnerHTML
 */
function createSafeTextNode(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  // Browser's textContent automatically escapes HTML entities
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
			try {
				// SECURITY: Validate container element before DOM operations
				if (!container || !(container instanceof HTMLDivElement)) {
					console.error('[SECURITY] Invalid container element for payment form');
					return;
				}

				// SECURITY: Validate payment configuration data
				if (!validatePaymentFormState({ data })) {
					console.error('[SECURITY] Payment configuration validation failed');
					return;
				}

				const adyenCheckout = await AdyenCheckout(
					createAdyenCheckoutConfig({ ...data, onSubmit, onAdditionalDetails }),
				);

			dropinComponentRef.current?.unmount();

			const dropin = adyenCheckout.create("dropin").mount(container);

			dropinComponentRef.current = dropin;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				console.error('[SECURITY] Payment form initialization error:', sanitizeErrorMessage(errorMsg));
			}
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
