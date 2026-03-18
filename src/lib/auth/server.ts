import "server-only";

import { createSaleorAuthClient } from "@saleor/auth-sdk";
import { cookies } from "next/headers";
import { invariant } from "ts-invariant";
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE, encodeCookieName } from "./constants";

const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
invariant(saleorApiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

/**
 * Server-side cookie storage for auth tokens.
 * Uses the same key encoding as the client-side storage to share cookies.
 */
const createServerCookieStorage = async () => {
	const cookieStore = await cookies();
	const isSecure = process.env.NODE_ENV === "production";

	// Security: Warn if not using HTTPS in production
	if (!isSecure && process.env.NODE_ENV === "production") {
		console.warn(
			"[Security] Auth tokens being stored without HTTPS. Ensure secure: true in production."
		);
	}

	return {
		getItem: (key: string): string | null => {
			const cookieName = encodeCookieName(key);
			return cookieStore.get(cookieName)?.value ?? null;
		},
		setItem: (key: string, value: string): void => {
			const cookieName = encodeCookieName(key);
			const maxAge = key.includes("refresh") ? REFRESH_TOKEN_MAX_AGE : ACCESS_TOKEN_MAX_AGE;
			try {
				// Security: Always use HttpOnly to prevent XSS token theft
				// Use Secure flag in production (HTTPS only) to prevent MITM attacks
				// Use SameSite=Lax to prevent CSRF while allowing normal navigation
				cookieStore.set(cookieName, value, {
					httpOnly: true, // CRITICAL: Prevents JavaScript access, protecting against XSS
					sameSite: "lax", // Prevents CSRF attacks
					secure: isSecure, // HTTPS only in production
					path: "/",
					maxAge,
				});
			} catch {
				// Ignore errors in read-only contexts (during render)
			}
		},
		removeItem: (key: string): void => {
			const cookieName = encodeCookieName(key);
			try {
				cookieStore.delete(cookieName);
			} catch {
				// Ignore errors in read-only contexts
			}
		},
	};
};

export const getServerAuthClient = async () => {
	const serverCookieStorage = await createServerCookieStorage();
	return createSaleorAuthClient({
		saleorApiUrl,
		refreshTokenStorage: serverCookieStorage,
		accessTokenStorage: serverCookieStorage,
	});
};
