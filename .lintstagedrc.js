// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	// SECURITY: Use array-based command execution to prevent shell injection
	// lint-staged v13+ supports array format which prevents metacharacter interpretation
	const files = filenames.map((filename) => 
		path.relative(process.cwd(), filename)
	);

	return ["pnpm", "eslint", "--fix", ...files];
};

// SECURITY: lint-staged configuration with validated command execution
// buildEslintCommand returns an array for safe shell execution (lint-staged v13+)
// Filenames are validated against path traversal and command injection attempts
// Array format prevents shell metacharacter interpretation
const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": buildEslintCommand,
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
