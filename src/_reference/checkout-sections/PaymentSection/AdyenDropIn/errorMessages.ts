/**
 * Client-facing error messages for payment failures
 * 
 * SECURITY: These messages are exposed to the client and should NOT contain:
 * - Specific gateway details (acquirer names, processor info)
 * - Internal transaction IDs
 * - System configuration details
 * - Payment method specifics beyond what user already knows
 * 
 * Sensitive error details are logged server-side only.
 */

/**
 * Redacts sensitive payment information from error messages
 * Removes transaction IDs, card details, internal codes, and stack traces
 * Implements defense-in-depth to prevent information disclosure attacks
 */
function redactSensitiveData(message: string): string {
  if (typeof message !== 'string') {
    return 'A payment error occurred';
  }
  
  let redacted = message;
  
  // Redact transaction/reference IDs (UUID, hex, and numeric patterns)
  redacted = redacted.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[REDACTED]');
  redacted = redacted.replace(/[a-f0-9]{32,}/gi, '[REDACTED]');
  redacted = redacted.replace(/ref[_-]?[0-9a-zA-Z]{10,}/gi, '[REDACTED]');
  redacted = redacted.replace(/txn[_-]?[0-9a-zA-Z]{10,}/gi, '[REDACTED]');
  
  // Redact card details (PAN, CVV patterns, expiry)
  redacted = redacted.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]');
  redacted = redacted.replace(/\b\d{2}\/\d{2,4}\b/g, '[EXPIRY]');
  redacted = redacted.replace(/\b[0-9]{3,4}\b(?=.*cvv|cvc|cid)/gi, '[CVV]');
  
  // Redact internal error codes and stack traces
  redacted = redacted.replace(/Error[:#]\s*[A-Z0-9_]+/gi, '[ERROR]');
  redacted = redacted.replace(/at\s+[a-zA-Z0-9$_.<>:]+/g, '[STACK]');
  redacted = redacted.replace(/\bat\s+.*\n/g, '[STACK]');
  
  // Redact file paths and URLs that might reveal internals
  redacted = redacted.replace(/\/(src|app|lib|node_modules)\/[^\s"']+/g, '[PATH]');
  
  return redacted;
}

export const adyenErrorMessages = {
	refused: "The transaction was refused.",
	acquirerError: "The transaction could not be processed. Please try again or contact support.",
	blockedCard: "The card used for the transaction is blocked, therefore unusable.",
	expiredCard: "The card used for the transaction has expired. Therefore it is unusable.",
	invalidAmount: "An amount mismatch occurred during the transaction process.",
	invalidCardNumber: "The specified card number is incorrect or invalid.",
	issuerUnavailable: "We cannot reach your bank at the moment. Please try again later.",
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
