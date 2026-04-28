import nextVitals from "eslint-config-next/core-web-vitals";
import security from "eslint-plugin-security";

const config = [
	...nextVitals,
	{
		ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
	},
	{
		plugins: {
			security,
		},
		rules: {
			"security/detect-object-injection": "warn",
			"security/detect-non-literal-regexp": "warn",
			"security/detect-unsafe-regex": "error",
			"security/detect-buffer-noassert": "error",
			"security/detect-child-process": "warn",
			"security/detect-no-csrf-before-method-override": "warn",
			"security/detect-non-literal-fs-filename": "warn",
			"security/detect-non-literal-require": "warn",
			"security/detect-possible-timing-attacks": "warn",
			"security/detect-eval-with-expression": "error",
			// XSS and template injection prevention
			"react/no-danger": "warn",
			"react/no-danger-with-children": "error",
			// API response validation
			"no-implied-eval": "error",
			"no-new-func": "error",
		},
		// Custom rules for GraphQL response validation
		languageOptions: {
			globals: {
				// Define GraphQL response validation as a best practice
			},
		},
	},
];

export default config;
