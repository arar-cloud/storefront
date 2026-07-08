// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	/**
	 * SECURITY: Shell argument escaping to prevent command injection.
	 * This function wraps filenames in single quotes and escapes any embedded single quotes.
	 * 
	 * Attack Prevention:
	 * - Input: file'; rm -rf /; echo '.js
	 * - Output: 'file'\'''; rm -rf /; echo '.js' (safe - treated as literal filename)
	 * 
	 * Whitelist Strategy:
	 * - Alphanumeric, dots, slashes, hyphens, underscores allowed unquoted
	 * - All other characters trigger single-quote wrapping and single-quote escaping
	 * 
	 * CRITICAL: Do not remove or weaken this escaping - filenames are attacker-controllable.
	 */
	const escapeShellArg = (arg) => {
		if (/[^\w._/\-]/.test(arg)) {
			// Contains shell metacharacters or spaces: wrap in single quotes
			// Replace any embedded single quotes with '\'' (end quote, escaped quote, start quote)
			return `'${arg.replace(/'/g, "'\\''")}' `;
		}
		// Safe characters only - return as-is
		return arg;
	};

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
