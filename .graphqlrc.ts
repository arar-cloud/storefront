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
 * Validates and sanitizes a GraphQL API URL to prevent SSRF attacks
 * and code generation from malicious schemas.
 * @param urlString - The URL string to validate
 * @throws Error if the URL is invalid or insecure
 * @returns Validated URL string
 */
function validateGraphQLUrl(urlString: string): string {
  if (!urlString) {
    throw new Error(
      "NEXT_PUBLIC_SALEOR_API_URL is not set. Please configure the environment variable."
    );
  }

  if (typeof urlString !== "string") {
    throw new Error("NEXT_PUBLIC_SALEOR_API_URL must be a string.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error(
      `NEXT_PUBLIC_SALEOR_API_URL is not a valid URL: ${urlString}`
    );
  }

  // Only allow http and https protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(
      `NEXT_PUBLIC_SALEOR_API_URL must use http or https protocol, got: ${parsedUrl.protocol}`
    );
  }

  // Block localhost and private IP ranges in production
  const host = parsedUrl.hostname;
  const isProduction = process.env.NODE_ENV === "production";
  const isPrivateHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host?.startsWith("192.168.") ||
    host?.startsWith("10.") ||
    host?.startsWith("172.16.") ||
    host?.startsWith("172.31.");

  if (isProduction && isPrivateHost) {
    throw new Error(
      `NEXT_PUBLIC_SALEOR_API_URL cannot use private or localhost addresses in production: ${host}`
    );
  }

  return urlString;
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
} else if (schemaUrl) {
	// Validate and sanitize the GraphQL API URL from environment
	try {
		schemaUrl = validateGraphQLUrl(schemaUrl);
	} catch (error) {
		console.error(
			`\n❌ GraphQL Code Generator Configuration Error:\n${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exit(1);
	}
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
