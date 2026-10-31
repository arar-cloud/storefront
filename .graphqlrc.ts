export const SCALARS = {
  Decimal: "number",
  Metadata: "Record<string, string>",
  DateTime: "string",
  Date: "string",
  JSON: "Record<string, unknown>",
  UUID: "string",
  PositiveDecimal: "number",
  Minute: "number",
} as const;

export function resolveSchemaSource(env: NodeJS.ProcessEnv = process.env): string {
  // Explicit override wins for any environment (CI, offline, local).
  if (env.SCHEMA_PATH) {
    return env.SCHEMA_PATH;
  }

  // Existing CI behaviour: use the committed schema file under GitHub Actions.
  if (env.GITHUB_ACTION) {
    return "schema.graphql";
  }

  const apiUrl = env.NEXT_PUBLIC_SALEOR_API_URL;
  if (!apiUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SALEOR_API_URL: set this env var or SCHEMA_PATH to generate GraphQL types.",
    );
  }
  return apiUrl;
}

export default {
  schema: resolveSchemaSource(),
  documents: ["src/**/*.graphql", "src/**/*.ts", "src/**/*.tsx"],
  extensions: {
    codegen: {
      scalars: SCALARS,
    },
  },
};
