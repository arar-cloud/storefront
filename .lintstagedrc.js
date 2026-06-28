// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

/**
 * Escapes a string for safe use in shell commands.
 * Wraps the string in single quotes and escapes any single quotes within it.
 * @param str - The string to escape
 * @returns The escaped string safe for shell execution
 */
function escapeShellArg(str) {
  return "'" + str.replace(/'/g, "'\\''" ) + "'";
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
