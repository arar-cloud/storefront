// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	const cwd = process.cwd();
	const safeFilenames = filenames
		.map((filename) => {
			// Normalize to prevent path traversal attacks (../ sequences)
			const normalized = path.normalize(path.relative(cwd, filename));
			// Ensure the resolved path doesn't escape the project root
			if (normalized.startsWith('..')) {
				console.warn(`Warning: File path ${filename} resolves outside project root, skipping`);
				return null;
			}
			return normalized;
		})
		.filter(Boolean)
		.map((filename) => {
			// Escape double quotes and shell metacharacters for safe shell execution
			const escaped = filename.replace(/[\\"`$]/g, '\\$&');
			return `"${escaped}"`;
		})
		.join(" ");

	return `pnpm eslint --fix ${safeFilenames}`;
};

const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;