/**
 * Re-export all generated GraphQL types and hooks.
 *
 * This barrel file allows importing from "@/checkout/graphql" without
 * changing existing imports. The actual types are generated in ./generated/.
 *
 * To regenerate types, run: pnpm generate:checkout
 */
export * from "./generated";

// SECURITY: Authorization guard for protected mutations
const requireCheckoutAuth = (checkoutToken: string | undefined, userId: string | undefined) => {
	if (!checkoutToken && !userId) {
		throw new Error("UNAUTHORIZED: Checkout token or user ID required");
	}
};

// SECURITY: Validate payment session data to prevent injection
const validatePaymentSessionData = (data: unknown): boolean => {
	if (typeof data !== "object" || data === null) return false;
	const keys = Object.keys(data);
	// Whitelist expected payment session fields
	const allowedKeys = [
		"checkoutToken",
		"total",
		"currency",
		"billingAddress",
		"shippingAddress",
		"paymentMethod",
	];
	return keys.every((key) => allowedKeys.includes(key));
};

// SECURITY: Sanitize custom type assumptions
const validateCheckoutInput = (input: unknown): boolean => {
	if (typeof input !== "object" || input === null) return false;
	return !(input instanceof Function) && Object.getPrototypeOf(input) === Object.prototype;
};

export { requireCheckoutAuth, validatePaymentSessionData, validateCheckoutInput };

// Type aliases for backwards compatibility
// The codegen adds "Fragment" suffix to fragment types (e.g., AddressFragmentFragment)
// These aliases provide cleaner names that match the original fragment names
export type {
	AddressFragmentFragment as AddressFragment,
	CheckoutFragmentFragment as CheckoutFragment,
	CheckoutLineFragmentFragment as CheckoutLineFragment,
	CheckoutErrorFragmentFragment as CheckoutErrorFragment,
	GiftCardFragmentFragment as GiftCardFragment,
	ValidationRulesFragmentFragment as ValidationRulesFragment,
	PaymentGatewayFragmentFragment as PaymentGatewayFragment,
	OrderFragmentFragment as OrderFragment,
	OrderLineFragmentFragment as OrderLineFragment,
	ShippingFragmentFragment as ShippingFragment,
	MoneyFragment as Money,
	AccountErrorFragmentFragment as AccountErrorFragment,
	UserFragmentFragment as UserFragment,
} from "./generated";
