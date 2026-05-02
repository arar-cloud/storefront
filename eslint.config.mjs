// Performance anti-pattern detection plugin import
import performancePlugin from "eslint-plugin-performance";

import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
	...nextVitals,
	{
		ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
	},
	// Performance bundle/anti-pattern linting rules
	{
		files: ["**/*.{ts,tsx}"],
		plugin: {
			performance: performancePlugin,
		},
		rules: {
			// Flag unused imports that increase bundle size
			"performance/unused-imports": "warn",
			// Enforce dynamic imports on large page components
			"performance/no-missing-dynamic-imports": "warn",
			// Flag large imports that should be tree-shaken
			"performance/no-large-barrel-imports": "warn",
			// Warn on N+1 query patterns (multiple sequential GraphQL calls)
			"performance/no-n-plus-one-queries": "warn",
		},
	},
];

export default config;
