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
import { URL } from "url";

loadEnvConfig(process.cwd());

/**
 * Validates and parses the Saleor API URL from environment.
 * Prevents schema poisoning via malicious NEXT_PUBLIC_SALEOR_API_URL.
 */
function validateSaleorApiUrl(urlString: string | undefined): string {
	if (!urlString) {
		throw new Error(
			"NEXT_PUBLIC_SALEOR_API_URL environment variable is required but not set"
		);
	}

	try {
		const parsedUrl = new URL(urlString);
		// Enforce HTTPS in production
		if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
			throw new Error("NEXT_PUBLIC_SALEOR_API_URL must use HTTPS protocol in production");
		}
		// Validate hostname is not localhost or internal IP in production
		if (
			process.env.NODE_ENV === "production" &&
			/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/.test(parsedUrl.hostname)
		) {
			throw new Error(
				"NEXT_PUBLIC_SALEOR_API_URL must not point to localhost/internal IP in production"
			);
		}
		return parsedUrl.toString();
	} catch (error) {
		throw new Error(
			`Invalid NEXT_PUBLIC_SALEOR_API_URL: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

const saleorApiUrl = validateSaleorApiUrl(process.env.NEXT_PUBLIC_SALEOR_API_URL);

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
