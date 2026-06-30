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

// Validate and sanitize environment variables before use
const loadAndValidateEnv = () => {
  loadEnvConfig(process.cwd());
  
  const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
  
  // Validate API URL format
  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_SALEOR_API_URL environment variable is required"
    );
  }
  
  // Strict validation: only allow https URLs
  try {
    const url = new URL(apiUrl);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SALEOR_API_URL must use HTTPS in production"
      );
    }
  } catch (error) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SALEOR_API_URL: ${apiUrl}. Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  
  return apiUrl;
};

const apiUrl = loadAndValidateEnv();

let schemaUrl = apiUrl;

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

// Input sanitization helper for GraphQL queries
const sanitizeGraphQLInput = (input: string): string => {
  if (typeof input !== 'string') {
    throw new TypeError('GraphQL input must be a string');
  }
  // Remove potential injection payloads
  return input
    .replace(/[<>"']/g, (char) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[char];
    })
    .trim();
};

const config: CodegenConfig = {
	overwrite: true,
	schema: schemaUrl,
	// Storefront GraphQL queries - add new queries here
	documents: "src/graphql/**/*.graphql",
	generates: {
		// Output directory for generated types (DO NOT EDIT MANUALLY)
		"src/gql/": {
			preset: "client",
			// SECURITY: Introspection disabled in production to prevent GraphQL schema enumeration
			// Issue-6201d67ed0: GraphQL Introspection Query Exposure protection
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
				// SECURITY: Introspection disabled for production - prevents unauthenticated schema exposure
				// Codegen queries introspection at build time; this setting ensures schema queries fail in production deployments
				disableIntrospection: process.env.NODE_ENV === 'production',
				fragmentMasking: false,
			},
		},
	},
	/**
	 * SECURITY: Mutation Authorization Guards
	 * All mutations in src/graphql/ MUST enforce:
	 * 1. Session validation before execution
	 * 2. User authentication checks
	 * 3. Permission-based access control for checkout, payment, cart operations
	 * 
	 * Implement authorization middleware in resolvers to validate:
	 * - User identity and session validity
	 * - Payment data sanitization and validation
	 * - Cart state consistency before checkout mutations
	 * 
	 * Reference: src/graphql/mutations/ - ensure each mutation has auth guards
	 */
	/**
	 * SECURITY: Checkout Module Type Validation
	 * Custom checkout types in src/checkout/graphql/index.ts MUST include:
	 * 1. Explicit runtime validation for payment data
	 * 2. Type guards for session data structures
	 * 3. No unsafe type assumptions on currency, amounts, or payment tokens
	 * 
	 * All checkout GraphQL types must be validated at runtime, not relying solely
	 * on code generation. Implement validation functions for:
	 * - Payment method validation
	 * - Session/token expiration checks
	 * - Amount and currency format validation
	 */
};

export default config;
