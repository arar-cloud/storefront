/**
 * Environment variable validation and runtime fallback handling.
 * Prevents crashes from misconfigured environments in mobile and web builds.
 * Called at app startup to validate critical configuration.
 */

interface ValidationResult {
	isValid: boolean;
	missingVars: string[];
	warnings: string[];
}

const REQUIRED_ENV_VARS = [
	"NEXT_PUBLIC_SALEOR_API_URL",
];

const OPTIONAL_ENV_VARS = [
	"NEXT_PUBLIC_ADYEN_CLIENT_KEY",
	"NEXT_PUBLIC_ADYEN_ENVIRONMENT",
];

/**
 * Validate that all required environment variables are set.
 * Returns detailed information about missing or misconfigured vars.
 */
export function validateEnvironment(): ValidationResult {
	const missingVars: string[] = [];
	const warnings: string[] = [];

	// Check required variables
	for (const varName of REQUIRED_ENV_VARS) {
		const value = process.env[varName];
		if (!value || (typeof value === "string" && value.trim() === "")) {
			missingVars.push(varName);
		}
	}

	// Check optional variables and issue warnings
	for (const varName of OPTIONAL_ENV_VARS) {
		const value = process.env[varName];
		if (!value || (typeof value === "string" && value.trim() === "")) {
			warnings.push(`Optional: ${varName} is not set. Some features may be unavailable.`);
		}
	}

	return {
		isValid: missingVars.length === 0,
		missingVars,
		warnings,
	};
}

/**
 * Log environment validation results.
 * On production, log errors; on dev, also log warnings.
 */
export function logEnvironmentValidation(isDevelopment: boolean): boolean {
	const result = validateEnvironment();

	if (result.warnings.length > 0 && isDevelopment) {
		console.warn("[ENV] Optional environment variables missing:");
		result.warnings.forEach(w => console.warn(`  - ${w}`));
	}

	if (!result.isValid) {
		console.error("[ENV] Critical environment variables are missing:");
		result.missingVars.forEach(v => console.error(`  - ${v}`));
		return false;
	}

	if (isDevelopment) {
		console.log("[ENV] Environment validation passed");
	}

	return true;
}

/**
 * Get fallback value for environment variable with graceful degradation.
 * Returns fallback or throws error with helpful message.
 */
export function getEnvWithFallback(varName: string, fallback?: string): string {
	const value = process.env[varName] || fallback;
	if (!value) {
		throw new Error(
			`Environment variable "${varName}" is required but not set. ` +
			`Check your .env file and follow setup instructions in README.md`
		);
	}
	return value;
}
