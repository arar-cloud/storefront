import nextVitals from "eslint-config-next/core-web-vitals";
import security from "eslint-plugin-security";
import graphql from "eslint-plugin-graphql";

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
			"security/detect-non-literal-regexp": "error",
			"security/detect-eval-with-expression": "error",
			"security/no-unsafe-innerhtml": "error",
			"security/no-unsanitized-innerhtml": "error",
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
	{
		files: ["**/*.graphql"],
		plugins: {
			graphql,
		},
		rules: {
			"graphql/template-strings": [
				"error",
				{
					env: "relay",
					againstSchema: process.env.NEXT_PUBLIC_SALEOR_API_URL,
				},
			],
			"graphql/no-deprecated-fields": "warn",
			"graphql/naming-convention": ["warn", { allowLeadingUnderscore: false }],
		},
	},
];

export default config;
