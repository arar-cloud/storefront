/**
 * Categorizes errors into recoverable (can retry) vs fatal (cannot retry)
 */
export enum ErrorCategory {
	RECOVERABLE = "RECOVERABLE", // Network, timeout, circuit breaker open
	FATAL = "FATAL", // Invalid card, fraud, declined
	UNKNOWN = "UNKNOWN",
}

/**
 * Classify error type for appropriate handling strategy
 */
export function classifyAdyenError(error: unknown): ErrorCategory {
	if (!error || typeof error !== "object") {
		return ErrorCategory.UNKNOWN;
	}

	const err = error as Record<string, unknown>;
	const resultCode = String(err.resultCode || "").toUpperCase();
	const errorCode = String(err.errorCode || "");

	// Recoverable errors - network, timeout, service degradation
	if (
		errorCode === "NetworkError" ||
		errorCode === "TimeoutError" ||
		errorCode === "ServiceUnavailable" ||
		resultCode === "REDIRECT" ||
		resultCode === "IDENTIFY_SHOPPER"
	) {
		return ErrorCategory.RECOVERABLE;
	}

	// Fatal errors - cannot retry
	if (
		resultCode === "REFUSED" ||
		resultCode === "CANCELLED" ||
		resultCode === "EXPIRED_CARD" ||
		resultCode === "INVALID_CARD"
	) {
		return ErrorCategory.FATAL;
	}

	return ErrorCategory.UNKNOWN;
}

import { getAdyenErrorCode, isAdyenError } from "./types";

/**
 * Helper to convert camelCase or snake_case strings
 */
function camelCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export const adyenErrorMessages = {
	refused: "The transaction was refused.",
	acquirerError: "The transaction did not go through due to an error that occurred on the acquirer's end.",
	blockedCard: "The card used for the transaction is blocked, therefore unusable.",
	expiredCard: "The card used for the transaction has expired. Therefore it is unusable.",
	invalidAmount: "An amount mismatch occurred during the transaction process.",
	invalidCardNumber: "The specified card number is incorrect or invalid.",
	issuerUnavailable: "It is not possible to contact the shopper's bank to authorise the transaction.",
	notSupported: "The shopper's bank does not support or does not allow this type of transaction.",
	"3DNotAuthenticated": "3D Secure authentication was not executed, or it did not execute successfully.",
	notEnoughBalance: "The card does not have enough money to cover the payable amount.",
	acquirerFraud: "Possible fraud.",
	cancelled: "The transaction was cancelled by the provider.",
	shopperCancelled: "The transaction was canceled by the shopper.",
	invalidPin: "The specified PIN is incorrect or invalid.",
	pinTriesExceeded: "The shopper specified an incorrect PIN more that three times in a row.",
	pinValidationNotPossible: "It is not possible to validate the specified PIN number.",
	fraud:
		"The pre-authorisation risk checks resulted in a fraud score of 100 or more. Therefore, the transaction was flagged as fraudulent, and was refused.",
	notSubmitted: "The transaction was not submitted correctly for processing.",
	fraudCancelled:
		"The sum of pre-authorisation and post-authorisation risk checks resulted in a fraud score of 100 or more. Therefore, the transaction was flagged as fraudulent, and was refused.",
	transactionNotPermitted: "Transaction not permitted to issuer, cardholder or the merchant.",
	cvcDeclined: "The specified CVC (card security code) is invalid.",
	restrictedCard:
		"The card you provided is either not viable to use in the country of the store or is restricted to use.",
	revocationOfAuth: "Cancel of the transaction requested by the shopper",
	declinedNotGeneric:
		"An error occured while trying to proceed with the payment. Try another payment method.",
	withdrawalAmountExceeded: "The withdrawal amount permitted for the shopper's card has exceeded.",
	withDrawalCountExceeded: "The number of withdrawals permitted for the shopper's card has exceeded.",
	issuerSuspectedFrad: "Issuer reported the transaction as suspected fraud.",
	avsDeclined: "The address data the shopper entered is incorrect.",
	cardRequiresOnlinePin: "The shopper's bank requires the shopper to enter an online PIN.",
	noCheckingAmountAvailableOnCard: "The shopper's bank requires a checking account to complete the purchase.",
	noSavingsAccountAvailableOnCard: "The shopper's bank requires a savings account to complete the purchase.",
	mobilePinRequired: "The shopper's bank requires the shopper to enter a mobile PIN.",
	contactlessFallback:
		"The shopper abandoned the transaction after they attempted a contactless payment and were prompted to try a different card entry method (PIN or swipe).",
	authenticationRequired:
		"The issuer declined the authentication exemption request and requires authentication for the transaction. Retry with 3D Secure.",
	rreqNotReceivedFromDS: "The issuer or the scheme wasn't able to communicate the outcome via RReq.",
	currentAidIsInPenaltyBox:
		"the payment network can't be reached. retry the transaction with a different payment method.",
	cvmRequiredRestartPayment: "A PIN or signature is required. Retry the transaction.",
	"3DsAuthenticationError":
		"The 3D Secure authentication failed due to an issue at the card network or issuer. Retry the transaction, or retry the transaction with a different payment method.",
};

/**
 * Safe error message lookup with comprehensive error recovery.
 * Prevents runtime errors from unmapped Adyen SDK error responses.
 * Handles both string error codes and Adyen error objects with fallback chain.
 */
export const getAdyenErrorMessage = (error?: string | null | unknown): string => {
	try {
		let code: string | undefined;

		if (typeof error === "string") {
			code = error;
		} else if (isAdyenError(error)) {
			code = getAdyenErrorCode(error);
		} else if (typeof error === "object" && error !== null) {
			const err = error as Record<string, unknown>;
			// Try errorCode first (Adyen standard)
			if (typeof err.errorCode === "string" && err.errorCode in adyenErrorMessages) {
				code = err.errorCode;
			}
			// Try message property as fallback
			if (!code && typeof err.message === "string" && err.message.length > 0) {
				return err.message;
			}
		}

		if (!code || typeof code !== "string") {
			return "An unexpected payment error occurred. Please try again.";
	}

		return adyenErrorMessages[code] || `Payment error: ${code}. Please try again.`;
	} catch {
		// Promise rejection catch-all: never throw from error handler
		return "An unexpected payment error occurred. Please try again.";
	}
};
