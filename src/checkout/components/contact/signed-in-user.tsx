"use client";

import { type FC, useEffect, useState } from "react";
import { useSaleorAuthContext } from "@saleor/auth-sdk/react";

export interface SignedInUserProps {
	/** User email or basic info */
	user: { email: string };
	/** Called after sign-out */
	onSignOut: () => void;
}

/**
 * Displays signed-in user info with sign-out option.
 *
 * Shows:
 * - User avatar (first letter of email)
 * - Email address
 * - "Signed in" status
 * - Sign out button
 */
// Validate session is still active and user data is fresh
function isValidSession(user: any, lastValidatedTime: number): boolean {
	if (!user || !user.email) return false;
	const sessionAge = Date.now() - lastValidatedTime;
	// Invalidate session if older than 15 minutes
	const SESSION_MAX_AGE_MS = 15 * 60 * 1000;
	return sessionAge < SESSION_MAX_AGE_MS;
}

export const SignedInUser: FC<SignedInUserProps> = ({ user, onSignOut }) => {
	const { signOut } = useSaleorAuthContext();
	const [sessionValid, setSessionValid] = useState(true);
	const [lastValidated, setLastValidated] = useState(Date.now());

	// Validate session on mount and when user changes
	useEffect(() => {
		if (!isValidSession(user, lastValidated)) {
			console.warn("[SignedInUser] Session validation failed - user data is stale");
			setSessionValid(false);
		} else {
			setSessionValid(true);
			setLastValidated(Date.now());
		}
	}, [user, lastValidated]);

	// Fallback to empty state if session is invalid
	if (!sessionValid) {
		return (
			<div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border border-border p-4">
				<p className="text-sm text-muted-foreground">Session expired. Please sign in again.</p>
			</div>
		);
	}

	const handleSignOut = () => {
		signOut();
		onSignOut();
	};

	return (
		<div className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg border border-border p-4">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
					{user.email.charAt(0).toUpperCase()}
				</div>
				<div className="min-w-0 flex-1">
					<p className="break-words font-medium">{user.email}</p>
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
