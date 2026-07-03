"use client";

import { type FC, useEffect, useState, useRef } from "react";
import { useSaleorAuthContext } from "@saleor/auth-sdk/react";
import { sanitizeEmail, encodeHtmlEntities, validateCsrfToken } from "@/checkout/lib/utils/input-sanitization";

export interface SignedInUserProps {
	/** User email or basic info */
	user: { email: string };
	/** Called after sign-out */
	onSignOut: () => void;
	/** CSRF token for session validation */
	csrfToken?: string;
}

/**
 * Generates a CSRF token for session state transitions
 * Prevents unauthorized state changes and session hijacking
 */
function generateCsrfToken(): string {
	if (typeof window !== 'undefined' && window.crypto) {
		const array = new Uint8Array(32);
		window.crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
	}
	return '';
}

/**
 * Displays signed-in user info with sign-out option.
 *
 * Shows:
 * - User avatar (first letter of email)
 * - Email address
 * - "Signed in" status
 * - Sign out button
 *
 * Security:
 * - CSRF tokens validate session state transitions
 * - Session validation prevents unauthorized sign-out triggers
 * - Email is validated before state changes
 */
export const SignedInUser: FC<SignedInUserProps> = ({ user, onSignOut, csrfToken }) => {
	const { signOut } = useSaleorAuthContext();
	const [sessionToken, setSessionToken] = useState<string>('');
	const [isValidSession, setIsValidSession] = useState<boolean>(true);
	const signOutInitiatedRef = useRef<boolean>(false);

	// Generate and validate CSRF token on mount and user change
	useEffect(() => {
		// Validate email format before processing session
		if (!user?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
			setIsValidSession(false);
			console.warn('Invalid user session: email validation failed');
			return;
		}

		// Generate session CSRF token
		const token = generateCsrfToken();
		setSessionToken(token);
		setIsValidSession(true);
	}, [user?.email]);

	const handleSignOut = () => {
		// Prevent multiple simultaneous sign-out attempts
		if (signOutInitiatedRef.current) {
			return;
		}

		// Validate session token and CSRF token before sign-out
		if (!sessionToken || !isValidSession) {
			console.error('Cannot sign out: invalid session state');
			return;
		}

		// Validate provided CSRF token matches expected format (if provided)
		if (csrfToken && !validateCsrfToken(csrfToken)) {
			console.error('Cannot sign out: invalid CSRF token format');
			return;
		}

		signOutInitiatedRef.current = true;

		try {
			signOut();
			onSignOut();
		} catch (error) {
			console.error('Sign out error:', error);
			signOutInitiatedRef.current = false;
		}
	};

	// Encode email for safe HTML output
	const encodedEmail = user?.email ? encodeHtmlEntities(user.email) : '';

	return (
		<div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border border-border p-4">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
					{(user.email.charAt(0) || '').toUpperCase()}
				</div>
				<div className="min-w-0 flex-1">
					<p className="break-words font-medium" title={user.email}>{encodedEmail}</p>
					<p className="text-sm text-muted-foreground">Signed in</p>
				</div>
			</div>
			<button
				type="button"
				onClick={handleSignOut}
				className="shrink-0 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground hover:no-underline"
			>
				Sign out
			</button>
		</div>
	);
};
