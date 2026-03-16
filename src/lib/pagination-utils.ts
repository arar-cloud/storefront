/**
 * Pagination Utilities
 * Provides cursor-based pagination helpers to avoid N+1 and unnecessary data loading
 */

export interface PaginationParams {
  first?: number; // Number of items to fetch
  after?: string; // Cursor for next page
  last?: number; // For backward pagination
  before?: string; // Cursor for previous page
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginatedConnection<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

/**
 * Build cursor-based pagination parameters for GraphQL queries
 * Prevents over-fetching by only requesting needed pages
 */
export function buildPaginationParams(
  pageSize: number = 20,
  currentCursor?: string,
  direction: "next" | "previous" = "next"
): PaginationParams {
  if (!currentCursor) {
    return { first: pageSize };
  }

  return direction === "next"
    ? { first: pageSize, after: currentCursor }
    : { last: pageSize, before: currentCursor };
}

/**
 * Extract cursor from paginated response for next fetch
 */
export function getNextCursor<T>(
  connection: PaginatedConnection<T>
): string | null {
  return connection.pageInfo.endCursor;
}

/**
 * Extract cursor from paginated response for previous fetch
 */
export function getPreviousCursor<T>(
  connection: PaginatedConnection<T>
): string | null {
  return connection.pageInfo.startCursor;
}
