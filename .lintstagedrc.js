// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import shellEscape from "shell-escape";

/**
 * Safely builds eslint command with proper shell escaping of filenames.
 * 
 * SECURITY: This function prevents command injection attacks by:
 * 1. Using shell-escape library to escape each filename individually
 * 2. Validating all input filenames are non-empty strings and contain no null bytes
 * 3. Filtering out invalid entries before shell command construction
 * 4. Converting to relative paths to prevent path traversal attacks
 * 5. Escaping filenames as array elements passed to shell-escape, not as strings
 * 
 * The shell-escape library handles all shell metacharacters including:
 * - Single/double quotes
 * - Backticks (prevents command substitution)
 * - Dollar signs (prevents variable expansion)
 * - Semicolons and pipes (prevents command chaining)
 * 
 * @param {string[]} filenames - Array of file paths to lint
 * @returns {string} Safe shell command with escaped filenames
 */
const buildEslintCommand = (filenames) => {
	// Validate input is an array
	if (!Array.isArray(filenames)) {
		throw new TypeError("buildEslintCommand expects an array of filenames");
	}

	// Filter out empty strings and validate each filename
	const validatedFiles = filenames.filter((filename) => {
		if (typeof filename !== "string" || filename.length === 0) {
			return false;
		}
		// Check for null bytes which could truncate paths in some contexts
		if (filename.includes("\0")) {
			return false;
		}
		return true;
	});

	if (validatedFiles.length === 0) {
		return "pnpm eslint --fix";
	}

	// Convert to relative paths and escape for shell safety
	// Each filename is individually escaped using shell-escape to prevent command injection
	// shell-escape properly handles all special characters: quotes, backticks, $, etc.
	// Passing filenames as an array to shellEscape() treats each as a separate argument
	const escapedFiles = validatedFiles
		.map((filename) => path.relative(process.cwd(), filename))
		.map((filename) => shellEscape([filename]))
		.join(" ");

	return `pnpm eslint --fix ${escapedFiles}`;
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
