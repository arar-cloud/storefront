"use client";

import { createContext, use, useMemo } from "react";
import { type AccountUser } from "@/app/[channel]/(main)/account/get-current-user";

const AccountContext = createContext<AccountUser | null>(null);

export function AccountProvider({ user, children }: { user: AccountUser; children: React.ReactNode }) {
	const memoizedUser = useMemo(() => user, [user]);
	return <AccountContext value={memoizedUser}>{children}</AccountContext>;
}

export function useAccountUser(): AccountUser {
	const user = use(AccountContext);
	if (!user) {
		throw new Error("useAccountUser must be used within an AccountProvider");
	}
	return user;
}
