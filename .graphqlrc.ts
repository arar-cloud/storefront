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

const fs = require("fs");
const path = require("path");

// Fallback schema cache for offline/local development support
const SCHEMA_CACHE_FILE = path.join(process.cwd(), ".graphql-schema-cache.json");

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
}

// Determine schema source with fallback strategy
let schema: string | undefined;

if (schemaUrl) {
	// Primary: Use API URL if available
	schema = schemaUrl;
} else if (fs.existsSync(SCHEMA_CACHE_FILE)) {
	// Secondary: Use cached schema if API URL unavailable
	try {
		const cacheData = JSON.parse(fs.readFileSync(SCHEMA_CACHE_FILE, "utf8"));
		if (cacheData.schema) {
			console.warn(
				"⚠️  NEXT_PUBLIC_SALEOR_API_URL not set. Using cached schema for code generation. This may be stale."
			);
			schema = cacheData.schema;
		}
	} catch (e) {
		// Cache file corrupted or unreadable
	}
}

if (!schema) {
	console.error(
		"GraphQL code generation failed: NEXT_PUBLIC_SALEOR_API_URL environment variable is not set, and no cached schema found."
	);
	console.error("Follow development instructions in the README.md file.");
	process.exit(1);
}

const schemaUrl = schema;

const config: CodegenConfig = {
	overwrite: true,
	schema: schema,
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
