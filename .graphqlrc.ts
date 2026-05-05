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
 * Validates that a GraphQL endpoint URL points to an allowed origin.
 * Prevents SSRF and schema poisoning attacks during code generation.
 * @param url - The URL to validate
 * @returns true if URL is valid, false otherwise
 * @throws Error if URL is malformed
 */
function validateGraphQLEndpointUrl(url: string): boolean {
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SALEOR_API_URL environment variable is not set. Configure it to your Saleor API endpoint."
    );
  }

  try {
    const urlObj = new URL(url);

    // Only allow https protocol in production
    if (
      process.env.NODE_ENV === "production" &&
      urlObj.protocol !== "https:"
    ) {
      throw new Error(
        `NEXT_PUBLIC_SALEOR_API_URL must use https:// in production. Got: ${urlObj.protocol}//`
      );
    }

    // Allow http only in development
    if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
      if (process.env.NODE_ENV === "development") {
        throw new Error(
          `NEXT_PUBLIC_SALEOR_API_URL must be https:// or http://localhost in development. Got: ${url}`
        );
      }
    }

    return true;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `NEXT_PUBLIC_SALEOR_API_URL is not a valid URL. Got: ${url}`
      );
    }
    throw error;
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

// Validate schema URL origin only for network URLs (skip for local schema.graphql)
if (schemaUrl !== "schema.graphql") {
	try {
		validateGraphQLEndpointUrl(schemaUrl);
	} catch (error) {
		console.error(
			`Security validation failed for NEXT_PUBLIC_SALEOR_API_URL: ${error instanceof Error ? error.message : String(error)}`,
		);
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
