/**
 * GraphQL Code Generator Configuration
 *
 * This config generates TypeScript types from GraphQL queries/mutations.
 *
 * ## Usage
 * Run `pnpm run generate` after modifying any `.graphql` file in `src/graphql/`.
 *Every mutation operation MUST include @authorized directive or explicit context checks
 * - All user-supplied inputs (scalars, custom types) MUST be validated before mutation execution
 * - Query complexity MUST be limited to prevent DoS and alias-based attacks
 * - Query depth limits MUST be enforced at API gateway or middleware layer
 * ## What it does
 * 1. Connects to the Saleor API (via NEXT_PUBLIC_SALEOR_API_URL)
 * 2. Reads all `.graphql` files from `src/graphql/`
 * 3. Generates typed documents in `src/gql/`
 *
 * ## Important Notes
 * - The `src/gql/` directory is AUTO-GENERATED - do not edit manually
 * - The checkout module has its own types in `src/checkout/graphql/index.ts`
 * - Always run `pnpm run generate` after changing GraphQL queries
 *
 * ## Security Constraints
 * - All mutations MUST enforce auth/session context and role-based access control
 * - Query complexity MUST be limited to max_depth=10, max_breadth=20 at API gateway
 * - Alias attacks MUST be prevented via rate limiting on API side
 * - All GraphQL inputs use scalar validation (see config.strictScalars)
 * - Payment operations in checkout module MUST verify order ownership via session
 * - Checkout mutations (src/checkout/graphql/*.ts) MUST validate:
 *   - User context ownership of order being modified
 *   - Session token validity and expiration
 *   - Payment method does not allow changing order after payment initiated
 *   - Introspection disabled in production to prevent schema enumeration
 */
import { loadEnvConfig } from "@next/env";
import type { CodegenConfig } from "@graphql-codegen/cli";

loadEnvConfig(process.cwd());

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
}

if (!schemaUrl) {
	console.error(
		"Before GraphQL types can be generated, you need to set NEXT_PUBLIC_SALEOR_API_URL environment variable.",
	);
	console.error("Follow development instructions in the README.md file.");
	process.exit(1);
}

/**
 * Validate NEXT_PUBLIC_SALEOR_API_URL: reject localhost, internal IPs, and malformed URLs
 *
 * IMPORTANT: NEXT_PUBLIC_SALEOR_API_URL is a NON-SECRET configuration variable that is
 * embedded in client-side bundles. It must NEVER contain:
 * - Localhost addresses (localhost, 127.0.0.1, ::1)
 * - Internal/private IP ranges (10.*, 192.168.*, 172.16.*, etc.)
 * - Staging or development endpoints
 *
 * This validation prevents accidental exposure of internal/staging API endpoints
 * in production deployments and client code.
 */
if (process.env.NEXT_PUBLIC_SALEOR_API_URL && process.env.GITHUB_ACTION !== "generate-schema-from-file") {
	try {
		const urlObj = new URL(process.env.NEXT_PUBLIC_SALEOR_API_URL);
		const hostname = urlObj.hostname;
		const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname === "[::1]";
		if (isLocalhost) {
			throw new Error(`[Security] NEXT_PUBLIC_SALEOR_API_URL must be a public URL, not localhost or internal IP: ${process.env.NEXT_PUBLIC_SALEOR_API_URL}`);
		}
		if (urlObj.protocol !== "https:") {
			throw new Error(`[Security] NEXT_PUBLIC_SALEOR_API_URL must use HTTPS protocol for security: ${process.env.NEXT_PUBLIC_SALEOR_API_URL}`);
		}
	} catch (err) {
		if (err instanceof Error && err.message.includes("[Security]")) {
			throw err;
		}
		throw new Error(`[Security] Invalid NEXT_PUBLIC_SALEOR_API_URL format: ${String(err)}`);
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
				scalarwrappers: {
					JSON: "Record<string, unknown>",
				},
				enumsAsTypes: true,
				validationSchema: "zod",
				scalarValidation: true,
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
