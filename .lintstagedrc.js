// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	// SECURITY: Escape shell metacharacters to prevent command injection
	// This ensures filenames with special characters cannot break out of the command
	const escapeShellArg = (arg) => {
		if (/[^\w._/\-]/.test(arg)) {
			return `'${arg.replace(/'/g, "'\\''")}' `;
		}
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
