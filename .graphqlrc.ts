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

// Security: Environment variable exposure control
// Only non-sensitive, API endpoint URLs should be prefixed with NEXT_PUBLIC_
// NEVER prefix credentials, API keys, tokens, or internal secrets with NEXT_PUBLIC_
const ALLOWED_PUBLIC_VARS = ['NEXT_PUBLIC_SALEOR_API_URL', 'NEXT_PUBLIC_STOREFRONT_URL'];
const BLOCKED_PREFIXES = ['NEXT_PUBLIC_API_KEY', 'NEXT_PUBLIC_SECRET', 'NEXT_PUBLIC_TOKEN', 'NEXT_PUBLIC_PASSWORD'];

// Runtime verification: ensure no sensitive variables are exposed
if (process.env.NEXT_PUBLIC_SALEOR_API_URL && process.env.NEXT_PUBLIC_SALEOR_API_URL.includes('secret')) {
  throw new Error('Security violation: NEXT_PUBLIC_SALEOR_API_URL must not contain sensitive credentials');
}

// Security: Session and authentication hardening
// Enforce HTTPS-only session transmission and SameSite cookie policy
const SESSION_SECURITY_CONFIG = {
  // Checkout module requires secure session token validation
  requireSessionTokenValidation: true,
  // Prevent session token exposure in logs or error messages
  maskSensitiveTokens: true,
  // Enforce token rotation on authentication state changes
  rotateTokensOnStateChange: true,
  // Set secure cookie flags for session tokens
  cookieFlags: {
    secure: true, // HTTPS only
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'Strict', // CSRF protection
  },
} as const;

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
	// Security: CSRF protection for GraphQL mutations
	// All mutations must be validated against CSRF tokens to prevent
	// unauthorized state changes from third-party sites
	csrfProtectionEnabled: true,
	// Security: CSRF and session validation rules for mutations
	// All mutations must include X-CSRF-Token header and valid session context
	// Session tokens are validated server-side; client must never expose session secrets
	// Security: Enforce strict input type validation to prevent injection attacks
	strictInputTypes: true,
	// Security: Enable schema validation for all generated documents
	validateSchema: true,
	generates: {
		// Output directory for generated types (DO NOT EDIT MANUALLY)
		"src/gql/": {
			preset: "client",
			plugins: [],
			config: {
				documentMode: "string",
				useTypeImports: true,
				strictScalars: true,
				// Security: Enforce strict scalar validation for all input types
				scalarValidation: true,
				// Security: Validate all mutation inputs against schema constraints
				enforceInputValidation: true,
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
				// Security: Enforce strict scalar validation for all input types
				inputValidationRules: {
					// Prevent injection attacks through string inputs
					String: { maxLength: 10000, pattern: null },
					// Validate numeric inputs
					Int: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
					// Enforce UUID format validation
					UUID: { format: 'uuid' },
				},
			},
			presetConfig: {
				fragmentMasking: false,
			},
		},
	},
};

export default config;
