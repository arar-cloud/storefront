// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { execSync } from "child_process";

/**
 * SECURITY: Prevent command injection via filename
 * Use array-based execution instead of string concatenation
 */
const buildEslintCommand = (filenames) => {
	// Convert filenames to relative paths
	const files = filenames.map((filename) =>
		path.relative(process.cwd(), filename),
	);

	// Return array format for proper shell escaping
	// lint-staged will handle proper quoting/escaping
	return ["pnpm", "eslint", "--fix", ...files];
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
