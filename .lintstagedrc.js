// https://nextjs.org/docs/basic-features/eslint#lint-staged

import path from "path";

const buildEslintCommand = (filenames) => {
	const cwd = process.cwd();
	const safeFilenames = filenames
		.map((filename) => {
			// Resolve to absolute path and validate it stays within project root
			const resolved = path.resolve(filename);
			const cwdResolved = path.resolve(cwd);
			if (!resolved.startsWith(cwdResolved + path.sep) && resolved !== cwdResolved) {
				console.warn(`Warning: File path ${filename} resolves outside project root, skipping`);
				return null;
			}
			// Return relative path for command construction
			const normalized = path.relative(cwdResolved, resolved);
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

// Security note: prettier --write --ignore-unknown is hardcoded and does not accept staged filenames,
// preventing command injection via filename arguments. Do not modify this to pass filenames directly.
const config = {
	"*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}": [buildEslintCommand],
	"*.*": "prettier --write --ignore-unknown",
};

export default config;