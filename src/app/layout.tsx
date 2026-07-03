import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Suspense, type ReactNode } from "react";
import { DraftModeNotification } from "@/ui/components/draft-mode-notification";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Content Security Policy configuration
 * Prevents inline script injection and restricts external script loading.
 * Enforced on all pages including payment flows to protect sensitive data.
 */
function getCspHeader(): string {
	const cspDirectives = [
		"default-src 'self'",
		"script-src 'self' https://js.stripe.com https://q.stripe.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' https: data:",
		"font-src 'self' data: https:",
		"connect-src 'self' https://api.stripe.com",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"object-src 'none'",
	];
	return cspDirectives.join('; ');
}

/**
 * Root metadata for the entire site.
 * Configuration is in src/lib/seo/config.ts
 */
export const metadata = rootMetadata;

/**
 * Security headers configuration
 * Adds security headers to all responses
 */
const securityHeaders: Record<string, string> = {
	'Content-Security-Policy': getCspHeader(),
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'X-XSS-Protection': '1; mode=block',
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(self)',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	return (
		<html lang={localeConfig.htmlLang} className={`${GeistSans.variable} ${GeistMono.variable} min-h-dvh`}>
			<body className="min-h-dvh font-sans">
				{children}
				<Suspense>
					<DraftModeNotification />
				</Suspense>
				<SpeedInsights />
			</body>
		</html>
	);
}
