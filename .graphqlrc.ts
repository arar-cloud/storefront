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
				/**
				 * SECURITY: Static Query Enforcement (documentMode='documentNode')
				 * 
				 * CRITICAL CONSTRAINT: All GraphQL queries MUST be statically defined in src/graphql/*.graphql files.
				 * Violations of this constraint enable GraphQL injection attacks.
				 * 
				 * PROHIBITED:
				 * - Constructing GraphQL queries from user input
				 * - Interpolating user data into query strings
				 * - Using template literals or string concatenation for queries
				 * - Dynamically selecting queries based on user requests
				 * 
				 * REQUIRED:
				 * - Define all queries statically in .graphql files
				 * - Use GraphQL variables for all dynamic values
				 * - Example: pass userInput as a variable, never in the query string
				 * 
				 * MECHANISM: documentMode='documentNode' compiles queries at build time,
				 * preventing runtime query injection attacks.
				 */
				documentMode: "documentNode",
				// All GraphQL queries must be statically defined in src/graphql/*.graphql files
				// Dynamic query construction from user input is NOT permitted
				useTypeImports: true,
				strictScalars: true,
				/**
				 * SECURITY: Scalar type mapping with safe deserialization.
				 * GenericScalar and JSON types must never deserialize arbitrary code.
				 * - Explicitly type as Record<string, unknown> to enforce runtime validation
				 * - Consumers must validate all fields before use
				 * - Never eval(), Function(), or pass untrusted scalars to dynamic operations
				 */
				scalarsMap: {
					GenericScalar: "Record<string, unknown>",
					JSON: "Record<string, unknown>",
				},
				// SECURITY: GenericScalar and JSON scalars are typed as 'unknown' to enforce runtime validation
				// Before using these scalars, validate structure and type at runtime to prevent arbitrary code execution
				// Example: Use Zod, io-ts, or similar validation libraries to parse unknown scalar values
				scalars: {
					Date: "string",
					DateTime: "string",
					Day: "number",
					Decimal: "number",
					GenericScalar: "unknown", // Enforce runtime validation before deserialization
					JSON: "unknown", // Enforce runtime validation before deserialization
					JSONString: "string", // SECURITY: All scalar values are validated at runtime before use. Never deserialize scalars as executable code or functions
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
