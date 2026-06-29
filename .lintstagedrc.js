// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { spawn } from "child_process";

/**
 * Safely escape shell special characters in filenames to prevent command injection.
 * Handles quotes, backslashes, and other shell metacharacters.
 */
function escapeShellArg(arg) {
	// On Windows, use double quotes with proper escaping
	if (process.platform === "win32") {
		return '"' + arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
	}
	// On Unix-like systems, use single quotes (safest option)
	// Single quotes preserve literal value of all characters
	return "'" + arg.replace(/'/g, "'\\''" ) + "'";
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
