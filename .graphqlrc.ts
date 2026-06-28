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
import { URL as URLClass } from "url";

loadEnvConfig(process.cwd());

/**
 * Validates and sanitizes GraphQL API URL from environment
 * @param urlString - The URL string to validate
 * @returns The validated URL string
 * @throws Error if URL is invalid, uses disallowed protocol, or is malformed
 */
function validateGraphQLApiUrl(urlString: string | undefined): string {
  if (!urlString) {
    throw new Error("NEXT_PUBLIC_SALEOR_API_URL environment variable is not set");
  }

  try {
    const url = new URLClass(urlString);
    
    // Only allow https or http protocols
    if (!url.protocol.match(/^https?:$/)) {
      throw new Error(`Invalid protocol: ${url.protocol}. Only http and https are allowed.`);
    }
    
    // Validate hostname is not localhost/127.0.0.1 in production
    if (process.env.NODE_ENV === "production") {
      const hostname = url.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
        throw new Error("Cannot use localhost/127.0.0.1 GraphQL URL in production");
      }
    }
    
    // Return normalized URL string
    return url.toString();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid GraphQL API URL: ${error.message}`);
    }
    throw new Error("Invalid GraphQL API URL");
  }
}

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
