/**
 * GraphQL Code Generator Configuration
 *
 * This config generates TypeScript types from GraphQL queries/mutations.
 *
 * ## Usage
 * Run `pnpm run generate` after modifying any `.graphql` file in `src/graphql/`.
 *
 * ## What it does
 * 1. Connects to the Saleor API (via NEXT_PUBLIC_SALEOR_API_URL)
 * 2. Reads all `.graphql` files from `src/graphql/`
 * 3. Generates typed documents in `src/gql/`
 *
 * ## Important Notes
 * - The `src/gql/` directory is AUTO-GENERATED - do not edit manually
 * - The checkout module has its own types in `src/checkout/graphql/index.ts`
 * - Always run `pnpm run generate` after changing GraphQL queries
 */
import { loadEnvConfig } from "@next/env";
import type { CodegenConfig } from "@graphql-codegen/cli";

loadEnvConfig(process.cwd());

/**
 * Validates that a schema URL is a valid HTTPS/HTTP URL and not a file path.
 * Prevents SSRF, path traversal, and injection attacks.
 */
function validateSchemaUrl(url: string): { valid: boolean; error?: string } {
	if (!url) {
		return { valid: false, error: "Schema URL is empty" };
	}

	try {
		const parsed = new URL(url);

		// Only allow HTTPS (production) or HTTP (development/testing)
		if (!['https:', 'http:'].includes(parsed.protocol)) {
			return { valid: false, error: `Invalid protocol: ${parsed.protocol}. Only http/https allowed.` };
		}

		// Reject suspicious patterns that could indicate file paths or traversal attempts
		if (url.includes('..') || url.includes('~') || url.startsWith('file://')) {
			return { valid: false, error: 'URL contains suspicious path traversal or file path patterns' };
		}

		// Check that hostname is not localhost or private IP ranges (in production)
		const hostname = parsed.hostname;
		if (parsed.protocol === 'https:') {
			const privateRanges = ['127.0.0.1', 'localhost', '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];
			if (privateRanges.some(range => hostname === range || hostname.startsWith(range))) {
				return { valid: false, error: 'Production HTTPS URLs cannot point to private/localhost addresses' };
			}
		}

		return { valid: true };
	} catch (err) {
		return { valid: false, error: `Invalid URL format: ${err instanceof Error ? err.message : 'unknown error'}` };
	}
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
}

if (!schemaUrl) {
	console.error(
		"[GraphQL CodeGen] NEXT_PUBLIC_SALEOR_API_URL environment variable is not defined",
	);
	console.error("Set NEXT_PUBLIC_SALEOR_API_URL to a valid HTTPS URL before running code generation.");
	process.exit(1);
}

// Validate the schema URL format and safety (skip for file-based schema generation)
if (process.env.GITHUB_ACTION !== "generate-schema-from-file") {
	const validation = validateSchemaUrl(schemaUrl);
	if (!validation.valid) {
		console.error(`[GraphQL CodeGen] Invalid schema URL: ${validation.error}`);
		console.error(`Received: ${schemaUrl}`);
		console.error("Please ensure NEXT_PUBLIC_SALEOR_API_URL is a valid HTTPS URL.");
		process.exit(1);
	}
}

const config: CodegenConfig = {
	overwrite: true,
	schema: schemaUrl,
	// Storefront GraphQL queries - add new queries here
	documents: "src/graphql/**/*.graphql",
	generates: {
		// Output directory for generated types (DO NOT EDIT MANUALLY)
		"src/gql/": {
			preset: "client",
			plugins: [],
			config: {
				documentMode: "string",
				useTypeImports: true,
				strictScalars: true,
				scalars: {
					Date: "string",
					DateTime: "string",
					Day: "number",
					Decimal: "number",
					GenericScalar: "unknown",
					JSON: "unknown",
					JSONString: "string",
					Metadata: "Record<string, string>",
					Hour: "number",
					Minute: "number",
					PositiveInt: "number",
					PositiveDecimal: "number",
					UUID: "string",
					Upload: "unknown",
					WeightScalar: "unknown",
					_Any: "unknown",
				},
			},
			presetConfig: {
				fragmentMasking: false,
			},
		},
	},
};

export default config;
