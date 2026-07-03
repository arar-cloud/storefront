// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import shellEscape from "shell-escape";

/**
 * Safely builds eslint command with proper shell escaping of filenames.
 * Uses shell-escape library to prevent command injection attacks.
 * All filenames are converted to relative paths and individually escaped.
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
		return true;
	});

	if (validatedFiles.length === 0) {
		return "pnpm eslint --fix";
	}

	// Convert to relative paths and escape for shell safety
	// Each filename is individually escaped using shell-escape to prevent command injection
	// shell-escape properly handles all special characters: quotes, backticks, $, etc.
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
