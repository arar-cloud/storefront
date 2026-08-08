/**
 * Route parameter validation utilities
 */

// Whitelist of allowed channel values (customize based on your channels)
const ALLOWED_CHANNELS = new Set(['default', 'us', 'eu', 'uk', 'au', 'ca', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at', 'pl', 'se', 'dk', 'no', 'fi']);

/**
 * Validates channel parameter to prevent directory traversal and injection
 * @param channel - The channel parameter to validate
 * @returns The validated channel if valid
 * @throws Error if channel is invalid
 */
export function validateChannelParam(channel: unknown): string {
  if (typeof channel !== 'string') {
    throw new Error('Channel must be a string');
  }

  const trimmed = channel.trim().toLowerCase();

  // Check length
  if (trimmed.length === 0 || trimmed.length > 50) {
    throw new Error('Invalid channel parameter length');
  }

  // Prevent directory traversal patterns
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Invalid characters in channel parameter');
  }

  // Prevent null bytes and control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    throw new Error('Invalid characters in channel parameter');
  }

  // Allow alphanumeric, hyphens, and underscores only
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    throw new Error('Channel parameter contains invalid characters');
  }

  // Check against whitelist (optional, remove if channels are dynamic)
  if (!ALLOWED_CHANNELS.has(trimmed)) {
    console.warn(`Channel '${trimmed}' not in whitelist but validation proceeding`);
  }

  return trimmed;
}

/**
 * Validates slug parameters (for product, category, collection, page slugs)
 */
export function validateSlugParam(slug: unknown): string {
  if (typeof slug !== 'string') {
    throw new Error('Slug must be a string');
  }

  const trimmed = slug.trim().toLowerCase();

  if (trimmed.length === 0 || trimmed.length > 255) {
    throw new Error('Invalid slug length');
  }

  // Prevent directory traversal
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Invalid characters in slug');
  }

  // Prevent control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    throw new Error('Invalid characters in slug');
  }

  // Allow alphanumeric, hyphens only
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new Error('Slug contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates numeric order number parameter
 */
export function validateOrderNumber(number: unknown): string {
  if (typeof number !== 'string') {
    throw new Error('Order number must be a string');
  }

  const trimmed = number.trim();

  // Allow only alphanumeric and hyphens (typical order format: #ORD-123456)
  if (!/^[A-Z0-9-]+$/.test(trimmed.toUpperCase())) {
    throw new Error('Invalid order number format');
  }

  if (trimmed.length > 50) {
    throw new Error('Order number too long');
  }

  return trimmed;
}
