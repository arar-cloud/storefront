/**
 * GraphQL Code Generator Configuration for Checkout
 *
 * Run: pnpm generate:checkout
 */
import { loadEnvConfig } from "@next/env";
import type { CodegenConfig } from "@graphql-codegen/cli";

loadEnvConfig(process.cwd());

const schemaUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (!schemaUrl) {
	console.error("Missing NEXT_PUBLIC_SALEOR_API_URL environment variable");
	process.exit(1);
}

const config: CodegenConfig = {
	overwrite: true,
	schema: schemaUrl,
	documents: "src/checkout/graphql/**/*.graphql",
	generates: {
		"src/checkout/graphql/generated/index.ts": {
			plugins: ["typescript", "typescript-operations", "typescript-urql", "@graphql-codegen/urql-batching-plugin"],
			config: {
				useTypeImports: true,
				strictScalars: true,
				// Prevent redundant field selections across checkout steps (payment, shipping, order)
				dedupQueryDocuments: true,
				// Request batching for concurrent checkout operations
				enableCaching: true,
				validateDocuments: true,
				enumsAsTypes: true,
				scalars: {
					Date: "string",
					DateTime: "string",
					Day: "number",
					Decimal: {
					input: 'string | number',
					output: 'number',
				},
					GenericScalar: "unknown",
					JSON: {
					input: 'Record<string, any>',
					output: 'Record<string, any>',
				},
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
		},
	},
};

export default config;
