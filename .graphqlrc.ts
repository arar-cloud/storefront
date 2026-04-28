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

// Fragment deduplication plugin
const fragmentDeduplicationPlugin = {
	async onLoad(context: any) {
		const fragments = new Map<string, Set<string>>();
		context.documents.forEach((doc: any) => {
			doc.definitions
				.filter((d: any) => d.kind === "FragmentDefinition")
				.forEach((frag: any) => {
					const fieldSet = new Set(
						frag.selectionSet.selections.map((s: any) => s.name?.value)
					);
					if (!fragments.has(frag.name.value)) {
						fragments.set(frag.name.value, fieldSet);
					}
				});
		});
		context.fragments = fragments;
	},
};

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

// Request cache to deduplicate introspection calls and prevent N+1 queries
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_DIR = "./.graphql-cache";
const SCHEMA_CACHE_FILE = join(CACHE_DIR, "schema.json");

const getCacheKey = (url: string, options: RequestInit) => {
	const hash = createHash("sha256");
	hash.update(`${url}:${JSON.stringify(options?.body || "")}`);
	return hash.digest("hex");
};

const loadSchemaFromCache = () => {
	try {
		if (existsSync(SCHEMA_CACHE_FILE)) {
			const cached = readFileSync(SCHEMA_CACHE_FILE, "utf-8");
			return JSON.parse(cached);
		}
	} catch (e) {
		// Ignore cache errors, fall through to fetch
	}
	return null;
};

const saveSchemaToCache = (schema: any) => {
	try {
		if (!existsSync(CACHE_DIR)) {
			require("fs").mkdirSync(CACHE_DIR, { recursive: true });
		}
		writeFileSync(SCHEMA_CACHE_FILE, JSON.stringify(schema, null, 2));
	} catch (e) {
		// Ignore cache write errors
	}
};

const requestCache = new Map<string, Promise<any>>();

const cachedFetch = async (url: string, options: RequestInit) => {
	const cacheKey = getCacheKey(url, options);
	
	// For introspection queries (schema fetches), check file-based cache first
	if (options?.body && typeof options.body === "string" && options.body.includes("__schema")) {
		const cached = loadSchemaFromCache();
		if (cached) {
			return Promise.resolve(cached);
		}
	}
	
	if (!requestCache.has(cacheKey)) {
		requestCache.set(
			cacheKey,
			fetch(url, options)
				.then(r => r.json())
				.then(data => {
					// Cache schema for next run
					if (options?.body && typeof options.body === "string" && options.body.includes("__schema")) {
						saveSchemaToCache(data);
					}
					return data;
				})
		);
	}
	return requestCache.get(cacheKey)!;
};

const config: CodegenConfig = {
	overwrite: true,
	schema: schemaUrl,
	fetch: cachedFetch,
	// Storefront GraphQL queries - add new queries here
	documents: [
		"src/graphql/**/*.graphql",
		"src/checkout/graphql/**/*.graphql",
	],
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
