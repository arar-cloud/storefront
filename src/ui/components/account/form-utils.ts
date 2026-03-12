/**
 * Safely extract a string field from FormData.
 * Throws if the field is missing or is a File.
 */
/**
 * Sanitize user input to prevent XSS attacks
 * Removes dangerous HTML/JS patterns while preserving valid text
 */
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove script tags and event handlers
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    // HTML escape special chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

export function getFormString(fd: FormData, key: string): string {
	const val = fd.get(key);
	if (typeof val !== "string") {
		throw new Error(`Missing or invalid form field: ${key}`);
	}
	return val;
}

/**
 * Extract an optional string field from FormData.
 * Returns undefined if empty or missing.
 */
export function getFormStringOptional(fd: FormData, key: string): string | undefined {
	const val = fd.get(key);
	if (typeof val !== "string" || val === "") return undefined;
	return val;
}
