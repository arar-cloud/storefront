// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	const files = filenames
		.map((filename) => path.relative(process.cwd(), filename));

	// Return array format for proper argument escaping: prevents shell injection via filenames
	return ["pnpm", "eslint", "--fix", ...files];
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
