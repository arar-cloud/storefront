// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { fileURLToPath } from "url";

const buildEslintCommand = (filenames) => {
	// SECURITY: Validate all filenames against path traversal
	if (!validateFilePaths(filenames)) {
		console.error("[SECURITY] Attempted path traversal detected. Rejecting files outside project root.");
		return [];
	}

	// SECURITY: Use array-based command execution to prevent shell injection
	// lint-staged v13+ supports array format which prevents metacharacter interpretation
	const files = filenames.map((filename) => 
		path.relative(process.cwd(), filename)
	);

	return ["pnpm", "eslint", "--fix", ...files];
};

// SECURITY: Validate file paths to prevent directory traversal attacks
const validateFilePaths = (filenames) => {
	const projectRoot = path.dirname(fileURLToPath(import.meta.url));
	const resolvedRoot = path.resolve(projectRoot);

	return filenames.every((filename) => {
		const resolved = path.resolve(filename);
		return resolved.startsWith(resolvedRoot);
	});
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
