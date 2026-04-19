import { useEffect } from "react";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { type PaymentStatus } from "@/checkout/sections/PaymentSection/types";
import { usePaymentGatewaysInitialize } from "@/checkout/sections/PaymentSection/usePaymentGatewaysInitialize";
import { usePaymentStatus } from "@/checkout/sections/PaymentSection/utils";
import { getQueryParams } from "@/checkout/lib/utils/url";

const paidStatuses: PaymentStatus[] = ["overpaid", "paidInFull", "authorized"];

// Payment retry configuration with exponential backoff
const PAYMENT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  circuitBreakerThreshold: 5, // Failures before circuit opens
};

let circuitBreakerFailureCount = 0;
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;

function isCircuitBreakerOpen(): boolean {
  if (!circuitBreakerOpen) return false;
  const now = Date.now();
  if (now > circuitBreakerResetTime) {
    circuitBreakerOpen = false;
    circuitBreakerFailureCount = 0;
    return false;
  }
  return true;
}

function recordPaymentFailure(): void {
  circuitBreakerFailureCount++;
  if (circuitBreakerFailureCount >= PAYMENT_RETRY_CONFIG.circuitBreakerThreshold) {
    circuitBreakerOpen = true;
    circuitBreakerResetTime = Date.now() + 30000; // 30s cooldown
  }
}

function recordPaymentSuccess(): void {
  circuitBreakerFailureCount = 0;
  circuitBreakerOpen = false;
}

async function withPaymentRetry<T>(
  fn: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  if (isCircuitBreakerOpen()) {
    throw new Error("Payment service circuit breaker open - too many recent failures");
  }

  try {
    const result = await fn();
    recordPaymentSuccess();
    return result;
  } catch (error) {
    recordPaymentFailure();
    if (retryCount < PAYMENT_RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        PAYMENT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
        PAYMENT_RETRY_CONFIG.maxDelayMs
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      return withPaymentRetry(fn, retryCount + 1);
    }
    throw error;
  }
}

export const usePayments = () => {
	const { checkout } = useCheckout();
	const paymentStatus = usePaymentStatus(checkout);

	const { fetching, availablePaymentGateways } = usePaymentGatewaysInitialize();

	const { onCheckoutComplete, completingCheckout } = useCheckoutComplete();

	useEffect(() => {
		const { processingPayment } = getQueryParams();

		// the checkout was already paid earlier, complete
		if (processingPayment) {
			return;
		}

		if (!completingCheckout && paidStatuses.includes(paymentStatus)) {
			void onCheckoutComplete();
		}
	}, [completingCheckout, onCheckoutComplete, paymentStatus]);

	return { fetching, availablePaymentGateways };
};
