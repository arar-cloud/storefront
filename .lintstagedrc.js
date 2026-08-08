// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

// Safely escape filenames to prevent command injection
function escapeShellArg(arg) {
	// If the argument contains no special characters, return it as-is
	if (/^[a-zA-Z0-9._/\-]*$/.test(arg)) {
		return arg;
	}
	// For arguments with special characters, wrap in single quotes and escape any single quotes
	return "'" + arg.replace(/'/g, "'\\''" ) + "'";
}

const buildEslintCommand = (filenames) => {
	// Properly escape each filename to prevent shell injection
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
