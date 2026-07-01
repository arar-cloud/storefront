#!/usr/bin/env node

/**
 * Docker Environment Validation Script
 *
 * Validates critical environment variables before docker-compose startup.
 * This prevents passing malicious URLs or invalid configurations to containers.
 *
 * Usage: node scripts/validate-docker-env.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import validation utilities
const validateEnvModule = await import(
  path.join(__dirname, "../src/lib/security/validate-env-url.ts")
).catch(() => {
  console.error("ERROR: Could not load validation module");
  process.exit(1);
});

const { validateGraphQLSchemaUrl, validateStorefrontUrl } = validateEnvModule;

const isDevelopment = process.env.NODE_ENV !== "production";
const requiredVars = [
  { name: "NEXT_PUBLIC_SALEOR_API_URL", validator: validateGraphQLSchemaUrl },
  { name: "NEXT_PUBLIC_STOREFRONT_URL", validator: validateStorefrontUrl },
];

let hasErrors = false;

for (const { name, validator } of requiredVars) {
  const value = process.env[name];

  if (!value) {
    console.error(`SECURITY ERROR: Missing required environment variable: ${name}`);
    hasErrors = true;
    continue;
  }

  try {
    validator(value, isDevelopment);
    console.log(`✓ ${name} is valid`);
  } catch (error) {
    console.error(
      `SECURITY ERROR: Invalid ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\nFailed to validate environment variables. Aborting docker-compose startup.");
  process.exit(1);
}

console.log("\n✓ All environment variables are valid. Safe to proceed with docker-compose.");
process.exit(0);
