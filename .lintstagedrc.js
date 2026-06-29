// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

/**
 * Escapes a filename for safe use in shell commands.
 * Prevents command injection via specially crafted filenames.
 * 
 * @param filename - The filename to escape
 * @returns Escaped filename safe for shell use
 */
function escapeShellArg(filename) {
	// Use single quotes to treat filename as literal string
	// Escape single quotes within the string by ending quote, adding escaped quote, and restarting quote
	const escaped = filename.replace(/'/g, "'\\''")
	return `'${escaped}'`;
}

const buildEslintCommand = (filenames) => {
	const files = filenames
		.map((filename) => path.relative(process.cwd(), filename))
		.map((filename) => escapeShellArg(filename))
		.join(" ");

	return `pnpm eslint --fix ${files}`;
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
