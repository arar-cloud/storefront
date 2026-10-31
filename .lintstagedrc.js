const LINT_EXTENSIONS = "*.{js,jsx,ts,tsx,mjs,cjs}";

module.exports = {
  // ESLint receives the file list as separate arguments; lint-staged escapes them.
  [LINT_EXTENSIONS]: (files) => {
    const args = files.map((file) => `"${file.replace(/(["\\$`])/g, "\\$1")}"`);
    return [`eslint --fix ${args.join(" ")}`];
  },
  // Prettier only handles files ESLint does not already format.
  "*.{json,md,mdx,css,scss,yml,yaml,html}": ["prettier --write"],
};
