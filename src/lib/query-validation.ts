/**
 * Query and filter validation utilities
 * Prevents SQL/NoSQL injection attacks
 */

/**
 * Validates search query string
 */
export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    throw new Error('Search query must be a string');
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return '';
  }

  if (trimmed.length > 1000) {
    throw new Error('Search query too long (max 1000 characters)');
  }

  // Remove null bytes
  if (trimmed.includes('\x00')) {
    throw new Error('Search query contains invalid characters');
  }

  // Allow basic alphanumeric and common search characters
  // Reject MongoDB operators and SQL keywords
  const dangerousPatterns = ['{', '}', 'db.', 'function', 'constructor', '--', ';', '/*', '*/', 'union', 'select', 'insert', 'update', 'delete', 'drop'];
  const queryLower = trimmed.toLowerCase();
  
  for (const pattern of dangerousPatterns) {
    if (queryLower.includes(pattern)) {
      throw new Error('Search query contains prohibited patterns');
    }
  }

  return trimmed;
}

/**
 * Validates sort parameter
 */
export function validateSortParam(sort: unknown): string {
  if (typeof sort !== 'string') {
    throw new Error('Sort parameter must be a string');
  }

  const trimmed = sort.trim().toLowerCase();

  // Whitelist allowed sort fields
  const ALLOWED_SORTS = [
    'date_asc',
    'date_desc',
    'status_asc',
    'status_desc',
    'total_asc',
    'total_desc',
    'name_asc',
    'name_desc',
  ];

  if (!ALLOWED_SORTS.includes(trimmed)) {
    throw new Error(`Invalid sort parameter. Allowed: ${ALLOWED_SORTS.join(', ')}`);
  }

  return trimmed;
}

/**
 * Validates pagination limit parameter
 */
export function validateLimitParam(limit: unknown): number {
  if (typeof limit === 'string') {
    const num = parseInt(limit, 10);
    if (isNaN(num)) {
      throw new Error('Limit must be a valid number');
    }
    return validateLimitParam(num);
  }

  if (typeof limit !== 'number') {
    throw new Error('Limit must be a number');
  }

  if (!Number.isInteger(limit)) {
    throw new Error('Limit must be an integer');
  }

  const MIN_LIMIT = 1;
  const MAX_LIMIT = 100;

  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }

  return limit;
}

/**
 * Validates pagination offset parameter
 */
export function validateOffsetParam(offset: unknown): number {
  if (typeof offset === 'string') {
    const num = parseInt(offset, 10);
    if (isNaN(num)) {
      throw new Error('Offset must be a valid number');
    }
    return validateOffsetParam(num);
  }

  if (typeof offset !== 'number') {
    throw new Error('Offset must be a number');
  }

  if (!Number.isInteger(offset)) {
    throw new Error('Offset must be an integer');
  }

  if (offset < 0) {
    throw new Error('Offset must be non-negative');
  }

  const MAX_OFFSET = 100000;
  if (offset > MAX_OFFSET) {
    throw new Error(`Offset exceeds maximum allowed value (${MAX_OFFSET})`);
  }

  return offset;
}

/**
 * Validates order status filter parameter
 */
export function validateStatusFilter(status: unknown): string {
  if (typeof status !== 'string') {
    throw new Error('Status must be a string');
  }

  const trimmed = status.trim().toUpperCase();

  const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

  if (!ALLOWED_STATUSES.includes(trimmed)) {
    throw new Error(`Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
  }

  return trimmed;
}
