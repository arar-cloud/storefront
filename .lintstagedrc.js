/**
 * lint-staged configuration.
 * Runs the same ESLint and Prettier tools used by the project so pre-commit checks match CI.
 */
module.exports = {
    '*.{js,jsx,ts,tsx,mjs,cjs}': [
        'eslint --fix --max-warnings=0',
        'prettier --write'
    ],
    '*.{json,md,yml,yaml,css,scss,html}': [
        'prettier --write'
    ],
    '*.{graphql,gql}': [
        'prettier --write'
    ]
};
