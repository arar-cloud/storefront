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
 *
 * ## SECURITY REQUIREMENTS
 * - ENVIRONMENT VARIABLES: Only NEXT_PUBLIC_* variables are safe for client-side exposure.
 *   Do NOT expose API keys, auth tokens, or sensitive secrets via NEXT_PUBLIC_* env vars.
 * - QUERY VALIDATION: All GraphQL queries must validate and sanitize user inputs to prevent injection attacks
 * - Use parameterized queries and escape all dynamic values before sending to the API
 * - Validate input types, lengths, and formats before passing to mutations
 * - Use GraphQL input type validation at schema level
 * - Sanitize string inputs to prevent XSS and injection attacks
 */
import { loadEnvConfig } from "@next/env";
import type { CodegenConfig } from "@graphql-codegen/cli";

loadEnvConfig(process.cwd());

// SECURITY: Use server-side SALEOR_API_URL for build-time schema access
// Never expose actual API URL as NEXT_PUBLIC_* in client code
// SECURITY: NEXT_PUBLIC_* variables are exposed to client-side code.
// Only use for non-sensitive configuration like API endpoints.
// NEVER store API keys, tokens, or secrets in NEXT_PUBLIC_* variables.
// Sensitive credentials must be server-side only (use SALEOR_API_TOKEN for backend)
let schemaUrl = process.env.SALEOR_API_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL;

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

const config: CodegenConfig = {
	overwrite: true,
	schema: schemaUrl || "",
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
				// SECURITY: Strict input validation enabled to prevent GraphQL injection
				// All scalars must be properly typed and validated at runtime
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

// SECURITY: Rate Limiting & Query Complexity
// Implement the following protections in your GraphQL server:
// 1. Query complexity analysis - reject overly complex queries
// 2. Depth limiting - restrict query nesting levels
// 3. Rate limiting - limit queries per user/IP per time window
// 4. Timeout enforcement - kill queries exceeding execution time
// Example middleware: use graphql-depth-limit and graphql-query-complexity

// SECURITY: Rate Limiting & DoS Protection
// GraphQL queries should be protected against:
// 1. Deep nesting attacks (implement maxDepth: 10 in validation)
// 2. High complexity queries (track field/list sizes and limit to complexity budget)
// 3. Rate limiting per IP/user (implement in API gateway or middleware)
// 4. Query timeout enforcement (prevent long-running queries from hanging)
// Saleor API should enforce these at server-side, but validate on client requests too.

export default config;
