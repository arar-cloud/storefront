// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { quote } from "shell-quote";

/**
 * Safely escapes filenames for shell execution to prevent command injection.
 * Quote function from shell-quote library properly escapes special characters.
 */
const buildEslintCommand = (filenames) => {
	const files = filenames
		.map((filename) => path.relative(process.cwd(), filename))
		.map((filename) => quote([filename]))
		.join(" ");

	return `pnpm eslint --fix ${files}`;
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
