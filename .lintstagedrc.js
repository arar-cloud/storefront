// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { quote } from "shell-quote";

const buildEslintCommand = (filenames) => {
	// Safely escape and quote filenames to prevent command injection
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
