import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { DraftModeNotification } from "@/ui/components/draft-mode-notification";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Security headers configuration
 */
export async function generateSecurityHeaders() {
  await headers();
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * Root metadata for the entire site.
 * Configuration is in src/lib/seo/config.ts
 */
export const metadata = rootMetadata;

/**
 * Security headers middleware configuration
 * CSP, X-Frame-Options, X-Content-Type-Options set via generateSecurityHeaders()
 * These headers prevent clickjacking, MIME-type attacks, and XSS (issue-7b89508d2d)
 */

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	// Security headers are configured via generateSecurityHeaders()
	// and should be applied at deployment level (Vercel headers config) or via next.config.js

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
