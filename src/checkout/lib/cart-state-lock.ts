/**
 * Cart state serialization and optimistic locking utilities.
 * Prevents race conditions from concurrent mutations and ensures consistent inventory.
 */

export interface CartStateVersion {
  version: number;
  timestamp: number;
  checksum: string;
}

interface PendingOperation {
  id: string;
  operation: () => Promise<any>;
  retries: number;
  maxRetries: number;
}

const operationQueue: PendingOperation[] = [];
let isProcessing = false;
let currentVersion: CartStateVersion | null = null;
const MAX_CONCURRENT_OPERATIONS = 1; // Serialize cart operations

/**
 * Calculate checksum for cart state validation.
 */
export function calculateCartChecksum(cartData: any): string {
  const json = JSON.stringify(cartData);
  let hash = 0;

  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

/**
 * Acquire optimistic lock for cart mutation.
 */
export async function acquireCartLock(): Promise<CartStateVersion> {
  const version = currentVersion || {
    version: 0,
    timestamp: Date.now(),
    checksum: '',
  };

  return {
    ...version,
    version: version.version + 1,
    timestamp: Date.now(),
  };
}

/**
 * Release lock after successful mutation.
 */
export function releaseCartLock(version: CartStateVersion, cartData: any): void {
  currentVersion = {
    ...version,
    checksum: calculateCartChecksum(cartData),
    timestamp: Date.now(),
  };
}

/**
 * Queue cart mutation for serialized execution.
 */
export async function queueCartOperation<T>(
  operation: () => Promise<T>,
  operationId: string,
  options?: { maxRetries?: number },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const maxRetries = options?.maxRetries || 3;
    const pendingOp: PendingOperation = {
      id: operationId,
      operation: async () => {
        try {
          const result = await operation();
          return result;
        } catch (error) {
          // Retry logic
          if (pendingOp.retries < maxRetries) {
            pendingOp.retries++;
            // Re-queue for retry
            operationQueue.push(pendingOp);
            throw error; // Will be caught and retried
          }
          throw error;
        }
      },
      retries: 0,
      maxRetries,
    };

    operationQueue.push(pendingOp);

    // Wrap resolution
    const originalOperation = pendingOp.operation;
    pendingOp.operation = async () => {
      try {
        const result = await originalOperation();
        resolve(result);
        return result;
      } catch (error) {
        if (pendingOp.retries >= pendingOp.maxRetries) {
          reject(error);
        }
        throw error;
      }
    };

    processQueue();
  });
}

/**
 * Process queued cart operations serially.
 */
async function processQueue(): Promise<void> {
  if (isProcessing || operationQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (operationQueue.length > 0) {
    const operation = operationQueue.shift();
    if (!operation) break;

    try {
      await operation.operation();
    } catch (error) {
      console.error(`[CartLock] Operation ${operation.id} failed:`, error);
      // Operation rejection handled by promise chain
    }
  }

  isProcessing = false;
}

/**
 * Validate cart version to detect concurrent mutations.
 */
export function validateCartVersion(expectedVersion: CartStateVersion, actualData: any): boolean {
  if (!currentVersion) return true;

  const actualChecksum = calculateCartChecksum(actualData);
  if (actualChecksum !== expectedVersion.checksum) {
    console.warn(
      '[CartLock] Cart state mismatch detected. Expected checksum:',
      expectedVersion.checksum,
      'Actual:',
      actualChecksum,
    );
    return false;
  }

  return true;
}

/**
 * Get current cart version.
 */
export function getCurrentCartVersion(): CartStateVersion | null {
  return currentVersion;
}

/**
 * Reset cart lock (on checkout completion or error).
 */
export function resetCartLock(): void {
  currentVersion = null;
  operationQueue.length = 0;
  isProcessing = false;
}

/**
 * Wrapper for cart operations with automatic locking.
 */
export async function withCartLock<T>(
  operation: (version: CartStateVersion) => Promise<T>,
  options?: {
    onVersionConflict?: () => Promise<T>; // Retry strategy on conflict
    maxRetries?: number;
  },
): Promise<T> {
  let retries = 0;
  const maxRetries = options?.maxRetries || 3;

  while (retries < maxRetries) {
    try {
      const version = await acquireCartLock();
      const result = await operation(version);
      return result;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      // On conflict, use retry strategy if provided
      if (options?.onVersionConflict) {
        try {
          return await options.onVersionConflict();
        } catch (conflictError) {
          throw conflictError;
        }
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retries) * 100),
      );
    }
  }

  throw new Error('Cart operation max retries exceeded');
}
