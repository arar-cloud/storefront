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
import path from "path";

// Load environment from the project root, not current working directory
// This prevents CI/CD context issues where process.cwd() may be unexpected
const projectRoot = path.resolve(path.dirname(__filename));
loadEnvConfig(projectRoot);

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

// Invoke URL validation to ensure credentials are never leaked in build logs
if (schemaUrl) {
	validatePublicApiUrl(schemaUrl);
}

// Security check: schema endpoint must be HTTPS and not contain basic auth or tokens
function validatePublicApiUrl(url: string): void {
	if (url === "schema.graphql") {
		return; // Skip validation for file-based schema
	}

	try {
		const parsedUrl = new URL(url);

		// Enforce HTTPS for public APIs
		if (parsedUrl.protocol !== "https:") {
			throw new Error("NEXT_PUBLIC_SALEOR_API_URL must use HTTPS protocol");
		}

		// Reject URLs with embedded credentials
		if (parsedUrl.username || parsedUrl.password) {
			throw new Error("NEXT_PUBLIC_SALEOR_API_URL must not contain credentials in URL");
		}

		// Reject private IP ranges and localhost
		const hostname = parsedUrl.hostname || "";
		const privateIpPattern = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
		if (privateIpPattern) {
			throw new Error("NEXT_PUBLIC_SALEOR_API_URL must not resolve to private IP ranges or localhost");
		}
	} catch (err) {
		if (err instanceof Error && err.message.includes("NEXT_PUBLIC_SALEOR_API_URL")) {
			throw err;
		}
		throw new Error("NEXT_PUBLIC_SALEOR_API_URL is not a valid URL format");
	}
}

if (schemaUrl) {
	validatePublicApiUrl(schemaUrl);
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
