"use client";

import { type FC } from "react";
import { Label } from "@/ui/components/ui/label";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { useContactSection } from "@/checkout/hooks/use-checkout-sections-context";
import { SignedInUser, GuestContact } from "@/checkout-sections-context/components/contact";

// User type matching what useUser() returns
type User = {
	id: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
};

// =============================================================================
// Types
// =============================================================================

interface ContactSectionProps {
	// Auth state
	isSignedIn: boolean;
	user: User | null | undefined;
	onSignOut: () => void;
	onSignInClick: () => void;

	// Email state (guests)
	email: string;
	onEmailChange: (value: string) => void;
	onEmailBlur: () => void;
	emailError?: string;

	// Create account state (guests)
	createAccount: boolean;
	onCreateAccountChange: (value: boolean) => void;
	password: string;
	onPasswordChange: (value: string) => void;
	passwordError?: string;

	// Subscribe state (guests)
	subscribeNews: boolean;
	onSubscribeChange: (value: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export const ContactSection: FC = () => {
	const { state, setState } = useContactSection();
	const {
		isSignedIn,
		user,
		email,
		createAccount,
		password,
		subscribeNews,
		emailError,
		passwordError,
	} = state;

	const handleSignOut = () => setState((prev) => ({ ...prev, isSignedIn: false, user: null }));
	const handleSignInClick = () => setState((prev) => ({ ...prev, showSignIn: true }));
	const handleEmailChange = (value: string) => setState((prev) => ({ ...prev, email: value }));
	const handleEmailBlur = () => setState((prev) => ({ ...prev, emailTouched: true }));
	const handleCreateAccountChange = (value: boolean) => setState((prev) => ({ ...prev, createAccount: value }));
	const handlePasswordChange = (value: string) => setState((prev) => ({ ...prev, password: value }));
	const handleSubscribeChange = (value: boolean) => setState((prev) => ({ ...prev, subscribeNews: value }));
	return (
		<section className="space-y-4">
			{isSignedIn && user ? (
				<>
					<h2 className="text-xl font-semibold">Contact</h2>
					<SignedInUser user={user} onSignOut={onSignOut} />
				</>
			) : (
				<>
					<GuestContact
						email={email}
						onEmailChange={onEmailChange}
						onEmailBlur={onEmailBlur}
						emailError={emailError}
						onSignInClick={onSignInClick}
						createAccount={createAccount}
						onCreateAccountChange={onCreateAccountChange}
						password={password}
						onPasswordChange={onPasswordChange}
						passwordError={passwordError}
					/>

					{/* Subscribe checkbox (only for guests not creating account) */}
					{!createAccount && (
						<div className="flex items-center gap-3">
							<Checkbox
								id="subscribe"
								checked={subscribeNews}
								onCheckedChange={(checked) => onSubscribeChange(checked === true)}
							/>
							<Label htmlFor="subscribe" className="cursor-pointer text-sm text-muted-foreground">
								Email me with news and offers
							</Label>
						</div>
					)}
				</>
			)}
		</section>
	);
};
