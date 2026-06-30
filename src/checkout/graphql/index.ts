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

// SECURITY: Validate payment input to prevent unsafe type assumptions and injection attacks
const validatePaymentInput = (input: unknown): boolean => {
	if (typeof input !== "object" || input === null) return false;
	const data = input as Record<string, unknown>;
	
	// Validate payment gateway ID is string and not empty
	if (data.gateway !== undefined && typeof data.gateway !== "string") return false;
	if (data.gateway === "") return false;
	
	// Validate token format - must be non-empty string, prevent code injection
	if (data.token !== undefined && typeof data.token !== "string") return false;
	if (data.token === "") return false;
	
	// Validate amount is positive number
	if (data.amount !== undefined && (typeof data.amount !== "number" || data.amount <= 0)) return false;
	
	return true;
};

// SECURITY: Validate session input to prevent token manipulation
const validateSessionInput = (input: unknown): boolean => {
	if (typeof input !== "object" || input === null) return false;
	const data = input as Record<string, unknown>;
	
	// Session ID must be non-empty string (opaque token or UUID)
	if (data.sessionId !== undefined && (typeof data.sessionId !== "string" || data.sessionId === "")) return false;
	
	// Validate no dangerous prototype pollution attempts
	if ("__proto__" in data || "constructor" in data || "prototype" in data) return false;
	
	return true;
};

// SECURITY: Sanitize custom type assumptions
const validateCheckoutInput = (input: unknown): boolean => {
	if (typeof input !== "object" || input === null) return false;
	return !(input instanceof Function) && Object.getPrototypeOf(input) === Object.prototype;
};

export { requireCheckoutAuth, validatePaymentSessionData, validateCheckoutInput, validatePaymentInput, validateSessionInput };

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
