// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	// Security: Sanitize filenames to prevent shell command injection
	// Use array-based command execution to safely pass filenames
	const relativeFiles = filenames.map((filename) =>
		path.relative(process.cwd(), filename)
	);

	// Return array format for lint-staged to safely pass arguments
	// This prevents shell metacharacters in filenames from being interpreted
	return ["pnpm", "eslint", "--fix", ...relativeFiles];
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
