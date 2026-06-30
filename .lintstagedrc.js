// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

// Use __dirname to get the project root reliably, avoiding process.cwd() issues in CI/CD
const projectRoot = path.dirname(new URL(import.meta.url).pathname);

const buildEslintCommand = (filenames) => {
	const files = filenames
		.map((filename) => path.relative(projectRoot, filename))
		.map((filename) => `"${filename}"`)
		.join(" ");

	return `pnpm eslint --fix ${files}`;
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
