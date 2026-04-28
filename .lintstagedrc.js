// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	const files = filenames
		.map((filename) => path.relative(process.cwd(), filename))
		.map((filename) => `"${filename}"`)
		.join(" ");

	return `pnpm eslint --fix ${files}`;
};

const buildTypeCheckCommand = (filenames) => {
	return "tsc --noEmit";
};

const buildSecurityAuditCommand = (filenames) => {
	return "pnpm audit --prod --audit-level=moderate";
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [
		buildEslintCommand,
		buildTypeCheckCommand,
	],
	"*.graphql": [
		"eslint --fix",
	],
	"package.json": [
		buildSecurityAuditCommand,
	],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
