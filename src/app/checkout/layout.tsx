import { type ReactNode } from "react";
export const revalidate = 3600; // ISR: revalidate every 1 hour
export const dynamic = "force-dynamic"; // Allow dynamic checkout session

import { AuthProvider } from "@/lib/auth";
import { brandConfig, formatPageTitle } from "@/config/brand";

export const metadata = {
	title: formatPageTitle("Checkout"),
	description: brandConfig.description,
};

export default function RootLayout(props: { children: ReactNode }) {
	return (
		<main>
			<AuthProvider>{props.children}</AuthProvider>
		</main>
	);
}
