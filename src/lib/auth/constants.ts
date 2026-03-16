/**
 * Auth token configuration.
 * Shared between client and server.
 */

// Token lifetimes (industry standard for e-commerce)
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Encode storage key to be a valid cookie name.
 * The SDK uses keys like "https://api.example.com/graphql/+saleor_auth_access_token"
 * which contain invalid cookie characters (: and /). We encode these to make valid names.
 */
export const encodeCookieName = (key: string): string => {
	return key.replace(/[^a-zA-Z0-9_-]/g, "_");
};

/**
 * Cookie security options for authentication tokens
 * Prevents CSRF, XSS, and man-in-the-middle attacks
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true, // Prevent JavaScript access (XSS mitigation)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // Strict CSRF protection
  path: '/', // Restrict to root path
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};
