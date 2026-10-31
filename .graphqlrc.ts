/**
 * GraphQL tooling configuration.
 * `schema` and `documents` globs are shared by codegen, editor extensions, and linters.
 * Keep these globs in sync with where schema and operation files live.
 */
const config = {
    schema: [
        '**/*.graphql',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/build/**'
    ],
    documents: [
        '**/*.{graphql,gql}',
        '**/*.{ts,tsx,js,jsx}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/build/**',
        '!**/*.generated.ts'
    ],
    ignoreNoDocuments: true
};

export default config;
