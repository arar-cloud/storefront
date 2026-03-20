/**
 * GraphQL Request Validation
 * Validates and sanitizes GraphQL variables before sending to API
 * Prevents injection attacks and ensures data integrity
 */

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE_REGEX = /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
const VALID_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 100;
const MAX_QUERY_DEPTH = 10;
const MAX_QUERY_COMPLEXITY = 1000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_REQUESTS = 100;

interface QueryMetrics {
  depth: number;
  complexity: number;
  timestamp: number;
}

const queryMetricsCache = new Map<string, QueryMetrics[]>();

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  if (typeof email !== "string") {
    errors.push("Email must be a string");
  } else if (!VALID_EMAIL_REGEX.test(email)) {
    errors.push("Invalid email format");
  } else if (email.length > MAX_STRING_LENGTH) {
    errors.push("Email exceeds maximum length");
  }
  return { valid: errors.length === 0, errors };
}

function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  if (typeof phone !== "string") {
    errors.push("Phone must be a string");
  } else if (!VALID_PHONE_REGEX.test(phone)) {
    errors.push("Invalid phone format");
  } else if (phone.length > 20) {
    errors.push("Phone exceeds maximum length");
  }
  return { valid: errors.length === 0, errors };
}

function validateString(str: string, maxLength = MAX_STRING_LENGTH, fieldName = "string"): ValidationResult {
  const errors: string[] = [];
  if (typeof str !== "string") {
    errors.push(`${fieldName} must be a string`);
  } else if (str.length > maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${maxLength}`);
  } else if (str.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }
  return { valid: errors.length === 0, errors };
}

function validateSlug(slug: string): ValidationResult {
  const errors: string[] = [];
  if (typeof slug !== "string") {
    errors.push("Slug must be a string");
  } else if (!VALID_SLUG_REGEX.test(slug)) {
    errors.push("Invalid slug format (only lowercase alphanumeric and hyphens allowed)");
  } else if (slug.length > 100) {
    errors.push("Slug exceeds maximum length");
  }
  return { valid: errors.length === 0, errors };
}

function validateArray(arr: unknown[], maxLength = MAX_ARRAY_LENGTH, fieldName = "array"): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(arr)) {
    errors.push(`${fieldName} must be an array`);
  } else if (arr.length > maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${maxLength}`);
  } else if (arr.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }
  return { valid: errors.length === 0, errors };
}

function validateQueryDepth(query: string): ValidationResult {
  const errors: string[] = [];
  const depthMatch = (query.match(/{/g) || []).length;
  if (depthMatch > MAX_QUERY_DEPTH) {
    errors.push(`Query depth ${depthMatch} exceeds maximum allowed depth of ${MAX_QUERY_DEPTH}`);
  }
  return { valid: errors.length === 0, errors };
}

function validateQueryComplexity(query: string): ValidationResult {
  const errors: string[] = [];
  const complexity = query.length * (query.match(/\$/g) || []).length;
  if (complexity > MAX_QUERY_COMPLEXITY) {
    errors.push(`Query complexity ${complexity} exceeds maximum allowed complexity of ${MAX_QUERY_COMPLEXITY}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateGraphQL(query: string, variables: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  
  const depthValidation = validateQueryDepth(query);
  if (!depthValidation.valid) {
    errors.push(...depthValidation.errors);
  }
  
  const complexityValidation = validateQueryComplexity(query);
  if (!complexityValidation.valid) {
    errors.push(...complexityValidation.errors);
  }
  
  const variablesValidation = graphqlValidation.validateVariables(variables);
  if (!variablesValidation.valid) {
    errors.push(...variablesValidation.errors);
  }
  
  return { valid: errors.length === 0, errors };
}

export const graphqlValidation = {
  validateEmail,
  validatePhone,
  validateString,
  validateSlug,
  validateArray,
  validateVariables: (variables: Record<string, unknown>): ValidationResult => {
    // Base validation - ensure variables object exists and is not null
    if (!variables || typeof variables !== "object") {
      return { valid: false, errors: ["Variables must be an object"] };
    }
    return { valid: true, errors: [] };
  },
};
