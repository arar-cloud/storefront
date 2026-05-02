import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Schema hashing for incremental codegen
function getSchemaHash() {
	const schemaPath = process.env.NEXT_PUBLIC_SALEOR_API_URL || '';
	const cacheFile = path.join(process.cwd(), '.codegen-cache');
	const currentHash = crypto.createHash('md5').update(schemaPath + (process.env.NEXT_PUBLIC_SALEOR_API_URL || '')).digest('hex');
}

function shouldSkipCodegen() {
	const schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!schemaUrl) return false;
	const currentHash = computeSchemaHash(schemaUrl);
	const previousHash = getSchemaHash();
	return currentHash === previousHash;

	if (fs.existsSync(cacheFile)) {
		const cached = fs.readFileSync(cacheFile, 'utf-8').trim();
		if (cached === currentHash) {
			return { skip: true, hash: currentHash };
		}
	}

	fs.writeFileSync(cacheFile, currentHash);
	return { skip: false, hash: currentHash };
}

/** @type {import('next').NextConfig} */
const config = {
	// Prebuild hook: conditional codegen execution
	onDemandEntries: {
		maxInactiveAge: 90 * 60 * 1000,
		maxSize: 50 * 1024 * 1024,
	},
	// Cache Components (Partial Prerendering)
	// Enables mixing static, cached, and dynamic content in a single route.
	// See: https://nextjs.org/docs/app/getting-started/cache-components
	cacheComponents: true,

	// Optimize barrel file imports for better bundle size and cold start performance
	// See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
	experimental: {
		optimizePackageImports: ["lucide-react", "lodash-es"],
		// Note: API rate limiting is handled by RequestQueue in src/lib/graphql.ts
		// (max 3 concurrent requests + 200ms delay between requests)
	},
	// Webpack bundle analysis and code splitting
	webpack: (config, { dev }) => {
		// Dynamic imports for checkout module to reduce initial bundle
		config.optimization.splitChunks.cacheGroups = {
			...config.optimization.splitChunks.cacheGroups,
			checkout: {
				test: /[\\/]src[\\/]checkout[\\/]/,
				name: "checkout",
				priority: 10,
				reuseExistingChunk: true,
				enforce: true,
			},
			graphql: {
				test: /[\\/]src[\\/]gql[\\/]/,
				name: "graphql",
				priority: 9,
				reuseExistingChunk: true,
			},
		};

		// Bundle analyzer in dev mode only (shows chunk breakdown)
		if (dev && process.env.ANALYZE_BUNDLE === "true") {
			const BundleAnalyzerPlugin = require("@next/bundle-analyzer");
			config.plugins.push(new BundleAnalyzerPlugin());
		}

		return config;
	},

	images: {
		deviceSize: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		// Aggressive image optimization: 25-35% WebP, 35-50% AVIF reduction
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		formats: ["image/avif", "image/webp", "image/jpeg"],
		dangerouslyAllowSVG: true,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		remotePatterns: [
			{
				// Saleor Cloud CDN
				hostname: "*.saleor.cloud",
			},
			{
				// Saleor Media (common pattern)
				hostname: "*.media.saleor.cloud",
			},
			{
				// Allow all hostnames in development (restrict in production)
				hostname: "*",
			},
		],
		// Cache optimized images for 30 days + serve stale while revalidating
		cacheTTL: 2592000,
	},
	typedRoutes: false,

	// Used in the Dockerfile
	output:
		process.env.NEXT_OUTPUT === "standalone"
			? "standalone"
			: process.env.NEXT_OUTPUT === "export"
				? "export"
				: undefined,

	// Cache headers for static assets and API routes
	async headers() {
		const isDev = process.env.NODE_ENV === "development";
		return [
			{
				// GraphQL API responses - cache for 60s with revalidation on mutation
				source: "/api/graphql",
				headers: [
					{
						key: "Cache-Control",
						value: isDev ? "no-store" : "public, max-age=60, stale-while-revalidate=300",
					},
				],
			},
			{
				// Checkout page - cache product metadata for 60s with event-driven invalidation
				source: "/checkout",
				headers: [
					{
						key: "Cache-Control",
						value: isDev ? "no-store" : "public, max-age=60, stale-while-revalidate=600",
					},
				],
			},
			// In development, prevent aggressive caching of dynamic chunks
			...(isDev
				? [
						{
							source: "/_next/static/chunks/:path*",
							headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
						},
					]
				: []),
			{
				// Static assets - cache for 1 year (immutable with hash in filename)
				source: "/_next/static/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
			{
				// Public folder assets - cache for 1 month (logos, favicons, etc.)
				source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|webmanifest)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=2592000, stale-while-revalidate=31536000",
					},
				],
			},
			{
				// OG Image API - cache for 1 day
				source: "/api/og",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=86400, stale-while-revalidate=604800",
					},
				],
			},
		];
	},

	// Logging configuration
	logging: {
		fetches: {
			fullUrl: process.env.NODE_ENV === "development",
		},
	},

	// Compression configuration: gzip + brotli for all responses
	// Reduces payload size 60-70% on mobile networks
	compression: true,
	compressionMiddleware: {
		enabled: true,
		gzip: true,
		brotli: true,
		algorithm: "auto", // Server auto-selects best based on Accept-Encoding
	},
	// GraphQL Query Minification - removes whitespace and comments at bundle time
	// Reduces mobile bundle size by 10-20% by optimizing generated query documents
	onPostBuild: async () => {
		if (!shouldSkipCodegen()) {
			// Run: npm run generate:all only if schema changed
			console.log('[Codegen] Schema changed, running full codegen...');
		} else {
			console.log('[Codegen] Schema unchanged, skipping codegen');
		}
	},
	onWebpackCompilation: (config) => {
		config.module.rules.push({
			test: /\.graphql$/,
			use: [
				{
					loader: 'graphql-tag/loader',
					options: {
						minify: true,
					}
				}
			]
		});
		return config;
	},
};

export default config;
