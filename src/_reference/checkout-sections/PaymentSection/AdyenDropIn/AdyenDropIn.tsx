import AdyenCheckout from "@adyen/adyen-web";
import { type FC, useCallback, useEffect, useRef } from "react";
import { z } from "zod";

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

	return <div ref={dropinContainerElRef} />;
};
