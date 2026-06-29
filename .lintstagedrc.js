// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

// Properly escape shell arguments to prevent command injection
function escapeShellArg(arg) {
	// If the string contains special characters, wrap it in single quotes and escape single quotes
	if (/[^\w./-]/.test(arg)) {
		return "'" + arg.replace(/'/g, "'\\''" ) + "'";
	}
	return arg;
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
