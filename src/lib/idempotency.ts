/**
 * Idempotency key management for mutation endpoints.
 * Prevents duplicate operations when clients retry requests.
 */

interface IdempotencyEntry {
  result: unknown;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
  error?: Error;
}

class IdempotencyManager {
  private static instance: IdempotencyManager;
  private cache = new Map<string, IdempotencyEntry>();
  private readonly TTL_MS = 3600000; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanup();
  }

  static getInstance(): IdempotencyManager {
    if (!IdempotencyManager.instance) {
      IdempotencyManager.instance = new IdempotencyManager();
    }
    return IdempotencyManager.instance;
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.TTL_MS) {
          this.cache.delete(key);
        }
      }
    }, 600000); // Cleanup every 10 minutes
  }

  validateIdempotencyKey(key: string | undefined): { valid: boolean; error?: string } {
    if (!key) {
      return { valid: false, error: 'Idempotency-Key header is required' };
    }
    if (key.length < 8 || key.length > 255) {
      return { valid: false, error: 'Idempotency-Key must be between 8 and 255 characters' };
    }
    return { valid: true };
  }

  getExisting(key: string): IdempotencyEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  setProcessing(key: string): void {
    this.cache.set(key, {
      result: null,
      timestamp: Date.now(),
      status: 'processing',
    });
  }

  setCompleted(key: string, result: unknown): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      status: 'completed',
    });
  }

  setFailed(key: string, error: Error): void {
    this.cache.set(key, {
      result: null,
      timestamp: Date.now(),
      status: 'failed',
      error,
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const idempotencyManager = IdempotencyManager.getInstance();

export function handleIdempotentRequest<T>(
  idempotencyKey: string | undefined,
  handler: () => Promise<T>
): Promise<{ result: T; cached: boolean } | { error: string; cached: boolean }> {
  const validation = idempotencyManager.validateIdempotencyKey(idempotencyKey);
  if (!validation.valid) {
    return Promise.resolve({ error: validation.error || 'Invalid idempotency key', cached: false });
  }

  const key = idempotencyKey!;
  const existing = idempotencyManager.getExisting(key);

  if (existing) {
    if (existing.status === 'processing') {
      return Promise.resolve({ error: 'Request is still processing', cached: false });
    }
    if (existing.status === 'completed') {
      return Promise.resolve({ result: existing.result as T, cached: true });
    }
    if (existing.status === 'failed' && existing.error) {
      return Promise.reject(existing.error);
    }
  }

  idempotencyManager.setProcessing(key);

  return handler()
    .then((result) => {
      idempotencyManager.setCompleted(key, result);
      return { result, cached: false };
    })
    .catch((error) => {
      idempotencyManager.setFailed(key, error);
      throw error;
    });
}
