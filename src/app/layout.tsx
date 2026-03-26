import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { headers } from "next/headers";

import "./globals.css";

// Apply security headers
export async function getSecurityHeaders() {
  return [
    {
      key: "Content-Security-Policy",
      value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.saleor.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.saleor.app; frame-ancestors 'none';",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-XSS-Protection",
      value: "1; mode=block",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
  ];
}
import { Suspense, type ReactNode } from "react";
import { DraftModeNotification } from "@/ui/components/draft-mode-notification";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Root metadata for the entire site.
 * Configuration is in src/lib/seo/config.ts
 */
export const metadata = rootMetadata;

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
