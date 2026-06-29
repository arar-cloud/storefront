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
import type { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as url from "url";

// Load only safe environment variables, excluding sensitive credentials
function loadSafeEnvConfig(cwd: string): void {
	const envPath = path.join(cwd, '.env.local');
	if (fs.existsSync(envPath)) {
		const env = dotenv.parse(fs.readFileSync(envPath));
		// Whitelist safe environment variables for GraphQL code generation
		const safeKeys = [
			'NEXT_PUBLIC_SALEOR_API_URL',
			'NEXT_PUBLIC_STOREFRONT_URL',
			'NODE_ENV',
		];
		safeKeys.forEach((key) => {
			if (env[key]) {
				process.env[key] = env[key];
			}
		});
	}
}

loadSafeEnvConfig(process.cwd());

// Validate and sanitize the API URL to prevent SSRF and injection attacks
function validateApiUrl(urlString: string | undefined): string {
  if (!urlString) {
    throw new Error('NEXT_PUBLIC_SALEOR_API_URL environment variable is not set');
  }

  try {
    const parsedUrl = new url.URL(urlString);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
    }
    // Ensure URL is an absolute URL
    if (!parsedUrl.href.startsWith('http')) {
      throw new Error('URL must be absolute');
    }
    return parsedUrl.href;
  } catch (error) {
    throw new Error(`Invalid API URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

let schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (process.env.GITHUB_ACTION === "generate-schema-from-file") {
	schemaUrl = "schema.graphql";
}

// Validate schema URL (skip validation for local schema.graphql file)
if (schemaUrl && schemaUrl !== "schema.graphql") {
	try {
		schemaUrl = validateApiUrl(schemaUrl);
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
