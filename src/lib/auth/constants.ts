/**
 * Auth token configuration.
 * Shared between client and server.
 * SECURITY: Token lifetimes are industry-standard. Review annually and adjust based on threat model.
 */
// @security-review token-expiry-constants

// Token lifetimes (industry standard for e-commerce)
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Encode storage key to be a valid cookie name.
 * The SDK uses keys like "https://api.example.com/graphql/+saleor_auth_access_token"
 * which contain invalid cookie characters (: and /). We encode these to make valid names.
 * Uses base64 encoding to prevent header injection and ensure deterministic output.
 */
export const encodeCookieName = (key: string): string => {
	// Base64 encode to safely handle all characters, then sanitize base64 output for cookie compatibility
	const encoded = Buffer.from(key).toString('base64').replace(/[+/=]/g, (match) => {
		const replacements: { [key: string]: string } = { '+': '-', '/': '_', '=': '' };
		return replacements[match] || match;
	});
	return `auth_${encoded}`; // Prefix to clearly identify encoded keys
};
