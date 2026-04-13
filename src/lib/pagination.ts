/**
 * Cursor-based pagination for API endpoints.
 * Reduces payload size and enables lazy-loading of large result sets.
 * Prevents memory bloat on mobile/web clients by returning configurable page sizes.
 */

export interface PaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginatedResult<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;

/**
 * Encode cursor for pagination
 */
export function encodeCursor(value: string | number): string {
  return Buffer.from(String(value)).toString('base64');
}

/**
 * Decode cursor from pagination
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Validate and normalize pagination input
 */
export function normalizePaginationInput(input: PaginationInput): {
  limit: number;
  offset: number | null;
  direction: 'forward' | 'backward';
} {
  let limit = input.first || DEFAULT_PAGE_SIZE;

  // Enforce size limits
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  if (limit < MIN_PAGE_SIZE) limit = MIN_PAGE_SIZE;

  // Determine offset from cursor
  let offset: number | null = null;
  let direction: 'forward' | 'backward' = 'forward';

  if (input.after) {
    const decoded = decodeCursor(input.after);
    offset = parseInt(decoded, 10);
  } else if (input.before) {
    const decoded = decodeCursor(input.before);
    offset = parseInt(decoded, 10);
    direction = 'backward';
  }

  return { limit, offset, direction };
}

/**
 * Build paginated response from items array
 */
export function buildPaginatedResponse<T>(
  items: T[],
  pagination: ReturnType<typeof normalizePaginationInput>,
  getTotalCount?: () => number | Promise<number>
): PaginatedResult<T> {
  const { limit, direction } = pagination;
  const itemCount = items.length;
  const pageItems = items.slice(0, limit);

  const edges = pageItems.map((item, index) => ({
    node: item,
    cursor: encodeCursor(String(index)),
  }));

  const pageInfo: PageInfo = {
    hasNextPage: itemCount > limit,
    hasPreviousPage: pagination.offset !== null && pagination.offset > 0,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
  };

  return {
    edges,
    pageInfo,
    totalCount: getTotalCount ? getTotalCount() : undefined,
  };
}

/**
 * Apply pagination constraints to GraphQL query variables
 */
export function getPaginationVariables(input: PaginationInput) {
  const normalized = normalizePaginationInput(input);
  return {
    first: normalized.limit,
    after: input.after || undefined,
  };
}

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
};
