// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

/**
 * SECURITY: Prevent command injection via filename
 * Use array-based execution instead of string concatenation
 * lint-staged supports array format for proper shell escaping
 */
const buildEslintCommand = (filenames) => {
	// Convert filenames to relative paths
	const files = filenames.map((filename) =>
		path.relative(process.cwd(), filename),
	);

	// Return array format for proper shell escaping
	// lint-staged will handle proper quoting/escaping and prevent injection
	// This prevents malicious filenames like "file.js; rm -rf /" from executing arbitrary commands
	return ["pnpm", "eslint", "--fix", ...files];
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
