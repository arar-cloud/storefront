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

// Validate GraphQL schema URL to prevent SSRF attacks
function validateGraphQLSchemaUrl(url: string | undefined): string {
	if (!url) {
		throw new Error('NEXT_PUBLIC_SALEOR_API_URL environment variable is not set');
	}

	try {
		const parsedUrl = new URL(url);

		// Enforce HTTPS protocol
		if (parsedUrl.protocol !== 'https:') {
			throw new Error('GraphQL schema URL must use HTTPS protocol');
		}

		// Validate hostname is not a private IP or localhost
		const hostname = parsedUrl.hostname;
		if (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.') ||
			hostname.startsWith('172.')
		) {
			throw new Error('GraphQL schema URL cannot target private IP addresses or localhost');
		}

		return url;
	} catch (error) {
		if (error instanceof TypeError) {
			throw new Error(`Invalid GraphQL schema URL: ${url}`);
		}
		throw error;
	}
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
}

// Validate schema URL (skip validation for local schema.graphql file)
if (schemaUrl && schemaUrl !== "schema.graphql") {
	try {
		schemaUrl = validateGraphQLSchemaUrl(schemaUrl);
	} catch (error) {
		console.error(
			error instanceof Error ? error.message : "Invalid GraphQL schema URL",
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
