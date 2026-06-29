// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	// Security: Command injection hardening
	// - Use array-based command execution (lint-staged spawns process, not shell)
	// - Never use template literals with filenames (e.g., `eslint --fix ${filenames}`)
	// - Filenames are safely passed as separate process arguments
	// - Relative paths prevent directory traversal attacks
	const relativeFiles = filenames.map((filename) => {
		const relative = path.relative(process.cwd(), filename);
		// Additional validation: ensure no null bytes or control characters
		if (/[\x00-\x1f\x7f]/u.test(relative)) {
			throw new Error(`Invalid filename detected: ${filename}`);
		}
		return relative;
	});

	// Return array format for lint-staged to safely pass arguments
	// This prevents shell metacharacters in filenames from being interpreted
	return ["pnpm", "eslint", "--fix", ...relativeFiles];
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
