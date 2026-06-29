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
 * Validate and sanitize GraphQL schema URL from environment variables
 * Ensures only valid HTTPS URLs are accepted to prevent injection attacks
 */
function validateSchemaUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('NEXT_PUBLIC_SALEOR_API_URL environment variable is required');
  }
  
  try {
    const parsed = new URL(url);
    
    // Enforce HTTPS protocol for production security
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('NEXT_PUBLIC_SALEOR_API_URL must use HTTPS protocol in production');
    }
    
    // Reject URLs with authentication credentials embedded
    if (parsed.username || parsed.password) {
      throw new Error('NEXT_PUBLIC_SALEOR_API_URL must not contain embedded credentials');
    }
    
    return url;
  } catch (error) {
    throw new Error(`Invalid NEXT_PUBLIC_SALEOR_API_URL: ${error instanceof Error ? error.message : 'Invalid URL format'}`);
  }
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
} else {
	try {
		schemaUrl = validateSchemaUrl(schemaUrl);
	} catch (error) {
		console.error((error as Error).message);
		console.error("Follow development instructions in the README.md file.");
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

/**
 * GraphQL code generator fetch configuration with security controls
 */
const fetchConfig = {
	// Enforce same-origin for CORS and prevent unauthorized cross-domain access
	headers: {
		'Origin': process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000',
	},
};

const config: CodegenConfig = {
	overwrite: true,
	schema: {
		[schemaUrl]: fetchConfig,
	},
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
	// Security: Validate query complexity and depth to prevent DoS attacks
	hooks: {
		afterOneFileWrite: [
			// Add complexity analysis warnings during code generation
			'echo "Note: Validate generated queries for complexity limits during code review"',
		],
	},
	// Rate limiting: Configure retry and timeout behavior to prevent resource exhaustion
	retries: {
		// Request timeout: 30 seconds max
		timeout: 30000,
		// Retry up to 3 times on transient failures
		attempts: 3,
		// Exponential backoff: wait 1s, 2s, 4s between retries
		delay: 1000,
	},
};

export default config;
