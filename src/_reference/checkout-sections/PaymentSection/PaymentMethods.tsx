import { useMemo, lazy, Suspense } from "react";
imconst lazyPaymentMethods = Object.entries(paymentMethodToComponent).reduce(
	(acc, [id, Component]) => ({
		...acc,
		[id]: lazy(() => Promise.resolve({ default: Component })),
	}),
	{} as typeof paymentMethodToComponent,
);

const paymentMethodToComponentt } from "./supportedPaymentApps";
import { PaymentSectionSkeleton } from "@/checkout/sections/PaymentSection/PaymentSectionSkeleton";
import { usePayments } from "@/checkout/sections/PaymentSection/usePayments";
import { useCheckoutUpdateState } from "@/checkout/state/updateStateStore";

export const PaymentMethods = () => {
	const { availablePaymentGateways, fetching } = usePayments();
	const {
		changingBillingCountry,
		updateState: { checkoutDeliveryMethodUpdate },
	} = useCheckoutUpdateState();

	const gatewaysWithDefinedComponent = useMemo(
		() => availablePaymentGateways.filter((gateway) => gateway.id in paymentMethodToComponent),
		[availablePaymentGateways],
	);

	// delivery methods change total price so we want to wait until the change is done
	if (changingBillingCountry || fetching || checkoutDeliveryMethodUpdate === "loading") {
		return <PaymentSectionSkeleton />;
	}

	return (
		<div className="gap-y-8">
			<Suspense fallback={<PaymentSectionSkeleton />}>
				{gatewaysWithDefinedComponent.map((gateway) => {
					const Component = lazyPaymentMethods[gateway.id];
					return (
						<Component
						key={gateway.id}
						// @ts-expect-error -- gateway matches the id but TypeScript doesn't know that
						config={gateway}
					/>
				);
			})}
		</div>
	);
};
