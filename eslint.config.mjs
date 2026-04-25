import nextVitals from "eslint-config-next/core-web-vitals";
import security from "eslint-plugin-security";

const config = [
	...nextVitals,
	{
		ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
	},
	{
		plugins: {
			security: security,
		},
		rules: {
			"security/detect-eval-with-expression": "error",
			"security/detect-non-literal-regexp": "warn",
			"security/detect-non-literal-require": "warn",
			"security/detect-unsafe-regex": "error",
			"security/detect-buffer-noalloc": "error",
			"security/detect-child-process": "warn",
			"security/detect-no-csrf-before-method-override": "warn",
			"security/detect-non-literal-fs-filename": "warn",
			"security/detect-non-literal-regexp": "warn",
			"security/detect-unsafe-regex": "error",
		},
	},
];

export default config;
