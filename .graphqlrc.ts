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

// Validate GraphQL API URL to prevent schema poisoning
function validateGraphQLUrl(url: string | undefined): string {
	if (!url) {
		throw new Error(
			"NEXT_PUBLIC_SALEOR_API_URL environment variable is not set. " +
			"Please configure it in your .env.local or environment variables.",
		);
	}

	try {
		const parsedUrl = new URL(url);

		// Enforce HTTPS for production, allow HTTP only for localhost/development
		if (parsedUrl.protocol !== "https:" && !parsedUrl.hostname.includes("localhost") && parsedUrl.hostname !== "127.0.0.1") {
			throw new Error(
				`GraphQL API URL must use HTTPS protocol for security. Received: ${parsedUrl.protocol}//${parsedUrl.hostname}`,
			);
		}

		return url;
	} catch (error) {
		if (error instanceof TypeError) {
			throw new Error(
				`Invalid GraphQL API URL format: ${url}. Expected a valid URL (e.g., https://api.saleor.cloud/graphql/)`,
			);
		}
		throw error;
	}
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
} else {
	schemaUrl = validateGraphQLUrl(schemaUrl);
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
