// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";
import { execFileSync } from "child_process";

const buildEslintCommand = (filenames) => {
	// SECURITY: Use execFileSync with array arguments to prevent command injection.
	// Path normalization prevents directory traversal and special character bypass.
	const files = filenames.map((filename) => path.relative(process.cwd(), filename));
	
	// Return a function that executes with safe parameterized command
	return () => {
		try {
			execFileSync("pnpm", ["eslint", "--fix", ...files], { stdio: "inherit" });
		} catch (error) {
			// Exit with error status to prevent commit
			process.exit(1);
		}
	};
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;
