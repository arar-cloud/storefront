// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import shellEscape from "shell-escape";

const buildEslintCommand = (filenames) => {
	const escapedFiles = filenames
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
