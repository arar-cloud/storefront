/**
 * Whitelist of allowed revalidate paths and tags
 * This prevents command injection and path traversal attacks
 */

const ALLOWED_REVALIDATE_TAGS = new Set([
  'products',
  'categories',
  'collections',
  'pages',
  'orders',
  'checkout',
  'account',
  'search',
  'home',
]);

const ALLOWED_REVALIDATE_PATHS = new Set([
  '/',
  '/products',
  '/categories',
  '/collections',
  '/pages',
  '/account',
  '/search',
]);

/**
 * Validate revalidate tag against whitelist
 */
export function isValidRevalidateTag(tag: unknown): tag is string {
  if (typeof tag !== 'string') {
    return false;
  }
  
  // Ensure tag matches pattern and is in whitelist
  const tagPattern = /^[a-z0-9_-]{1,50}$/i;
  return tagPattern.test(tag) && ALLOWED_REVALIDATE_TAGS.has(tag.toLowerCase());
}

/**
 * Validate revalidate path against whitelist
 */
export function isValidRevalidatePath(path: unknown): path is string {
  if (typeof path !== 'string') {
    return false;
  }
  
  // Ensure path is absolute, doesn't contain traversal, and is in whitelist
  const pathPattern = /^\/?[a-z0-9_/-]{1,255}$/i;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return (
    pathPattern.test(normalizedPath) &&
    !normalizedPath.includes('..') &&
    !normalizedPath.includes('//') &&
    (ALLOWED_REVALIDATE_PATHS.has(normalizedPath) ||
      Array.from(ALLOWED_REVALIDATE_PATHS).some((p) => normalizedPath.startsWith(p)))
  );
}

/**
 * Validate and sanitize revalidate request payload
 */
export function validateRevalidatePayload(payload: unknown): {
  valid: boolean;
  tags?: string[];
  paths?: string[];
  error?: string;
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload' };
  }
  
  const { tags, paths } = payload as Record<string, unknown>;
  const validTags: string[] = [];
  const validPaths: string[] = [];
  
  // Validate tags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return { valid: false, error: 'tags must be an array' };
    }
    
    if (tags.length > 10) {
      return { valid: false, error: 'too many tags (max 10)' };
    }
    
    for (const tag of tags) {
      if (!isValidRevalidateTag(tag)) {
        return { valid: false, error: `invalid tag: ${tag}` };
      }
      validTags.push(tag);
    }
  }
  
  // Validate paths
  if (paths !== undefined) {
    if (!Array.isArray(paths)) {
      return { valid: false, error: 'paths must be an array' };
    }
    
    if (paths.length > 10) {
      return { valid: false, error: 'too many paths (max 10)' };
    }
    
    for (const path of paths) {
      if (!isValidRevalidatePath(path)) {
        return { valid: false, error: `invalid path: ${path}` };
      }
      validPaths.push(path);
    }
  }
  
  if (validTags.length === 0 && validPaths.length === 0) {
    return { valid: false, error: 'either tags or paths required' };
  }
  
  return { valid: true, tags: validTags, paths: validPaths };
}
