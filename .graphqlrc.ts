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
 * Validates and sanitizes GraphQL schema URL from environment variable.
 * Ensures only valid HTTPS URLs are accepted to prevent schema injection attacks.
 */
function validateSchemaUrl(url: string | undefined): string {
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SALEOR_API_URL environment variable is not set"
    );
  }

  try {
    const parsedUrl = new URL(url);
    // Only allow https protocol for security
    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        `Invalid schema URL protocol: ${parsedUrl.protocol}. Only HTTPS is allowed.`
      );
    }
    // Ensure hostname is present and not localhost/IP-only (for production)
    if (!parsedUrl.hostname) {
      throw new Error("Invalid schema URL: missing hostname");
    }
    return parsedUrl.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Invalid schema URL format: ${url}. Must be a valid HTTPS URL.`
      );
    }
    throw error;
  }
}

let schemaUrl = validateSchemaUrl(process.env.NEXT_PUBLIC_SALEOR_API_URL);

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
