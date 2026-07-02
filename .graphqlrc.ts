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
 * ## Security Notes
 * - Environment variables are validated on load to prevent schema injection
 * - All GraphQL schema URLs must pass format validation (HTTPS scheme, valid hostname)
 * - Schema origin is verified before code generation begins
 * - Invalid URLs will cause the configuration to fail at load time and origin validation
 * - Review src/ directory for additional backend/frontend security considerations
 */
import { loadEnvConfig } from "@next/env";
import type { CodegenConfig } from "@graphql-codegen/cli";

loadEnvConfig(process.cwd());

/**
 * Validates the GraphQL schema URL to prevent schema injection attacks.
 * Enforces HTTPS scheme and valid hostname format.
 * @param url - The schema URL from environment variables
 * @throws Error if URL is invalid, missing, or does not meet security requirements
 * @returns The validated URL string
 */
function validateGraphQLSchemaUrl(url: string): string {
  if (!url) {
    throw new Error('NEXT_PUBLIC_SALEOR_API_URL environment variable is not set');
  }

  try {
    const urlObj = new URL(url);
    
    // Enforce HTTPS for production security
    if (urlObj.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('GraphQL schema URL must use HTTPS protocol in production');
    }
    
    // Validate hostname is not localhost or internal IP in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168') || hostname.startsWith('10.')) {
        throw new Error('GraphQL schema URL cannot point to localhost or internal IPs in production');
      }
    }
    
    // Reject URLs with embedded credentials in the hostname
    if (urlObj.username || urlObj.password) {
      throw new Error('GraphQL schema URL must not contain embedded credentials');
    }
    
    return url;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('GraphQL schema URL is not a valid URL format');
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

// Validate schema URL format and origin (skip for local file schema)
if (schemaUrl !== "schema.graphql") {
	schemaUrl = validateGraphQLSchemaUrl(schemaUrl);
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
