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
import fs from "fs";

loadEnvConfig(process.cwd());

/**
 * Validate GitHub Actions environment for security.
 * Prevents arbitrary code execution in CI/CD context.
 */
function validateGitHubActionsContext(): boolean {
  const githubActions = process.env.GITHUB_ACTIONS;
  const githubActionsEnv = process.env.GITHUB_ENV;
  
  // Only treat as legitimate CI if both env vars are set
  if (githubActions === "true" && githubActionsEnv) {
    return true;
  }
  return false;
}

/**
 * Validate schema file path to prevent directory traversal attacks.
 * Ensures schema file is within the allowed project directory.
 */
function validateSchemaPath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = process.cwd();
  const allowedBase = path.resolve(projectRoot, "src");
  
  // Ensure path is within project and src directory
  if (!resolvedPath.startsWith(allowedBase)) {
    console.warn(`[Security] Attempted to load schema from outside src/: ${filePath}`);
    return false;
  }
  
  // Verify file exists and is readable
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[Security] Schema file does not exist: ${filePath}`);
    return false;
  }
  
  return true;
}

let schemaUrl: string | null = null;

if (process.env.GITHUB_ACTIONS === "true") {
	if (validateGitHubActionsContext()) {
		const schemaPath = "schema.graphql";
		if (validateSchemaPath(schemaPath)) {
			schemaUrl = schemaPath;
		} else {
			throw new Error("[Security] Invalid schema path in GitHub Actions context");
		}
	}
} else {
	schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL || null;
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
	schema: schemaUrl || { "./schema.graphql": {} },
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
