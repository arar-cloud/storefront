/**
 * Safe external script loading with SRI (Subresource Integrity) and fallback mechanisms.
 * Prevents third-party script injection and provides graceful degradation.
 */

export interface SafeScriptConfig {
  src: string;
  integrity?: string; // SRI hash (sha384-...)
  timeout?: number; // ms before timeout
  fallbackFn?: () => void; // Execute if script fails
  onSuccess?: () => void; // Execute on success
  onError?: (error: Error) => void; // Execute on error
  attributes?: Record<string, string>; // Additional attributes
}

const loadedScripts = new Set<string>();
const failedScripts = new Set<string>();
const pendingScripts = new Map<string, Promise<void>>();

/**
 * Load an external script with SRI validation and timeout protection.
 * Returns a promise that resolves when script is loaded or rejects if it fails.
 */
export async function loadSafeScript(config: SafeScriptConfig): Promise<void> {
  const { src, integrity, timeout = 10000, fallbackFn, onSuccess, onError, attributes = {} } =
    config;

  // Return cached result if already loaded
  if (loadedScripts.has(src)) {
    onSuccess?.();
    return Promise.resolve();
  }

  // Return failure if script previously failed
  if (failedScripts.has(src)) {
    const error = new Error(`Script previously failed to load: ${src}`);
    onError?.(error);
    fallbackFn?.();
    return Promise.reject(error);
  }

  // Return pending promise if script is currently loading
  if (pendingScripts.has(src)) {
    return pendingScripts.get(src)!;
  }

  // Create new load promise
  const loadPromise = new Promise<void>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      const error = new Error(`Script load timeout: ${src}`);
      failedScripts.add(src);
      pendingScripts.delete(src);
      onError?.(error);
      fallbackFn?.();
      reject(error);
    }, timeout);

    try {
      const script = document.createElement("script");
      script.src = src;

      // Set SRI if provided
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = "anonymous";
      }

      // Set additional attributes
      Object.entries(attributes).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });

      // Success handler
      script.onload = () => {
        clearTimeout(timeoutHandle);
        loadedScripts.add(src);
        pendingScripts.delete(src);
        onSuccess?.();
        resolve();
      };

      // Error handler (network error, SRI mismatch, etc.)
      script.onerror = () => {
        clearTimeout(timeoutHandle);
        failedScripts.add(src);
        pendingScripts.delete(src);
        const error = new Error(`Failed to load script: ${src}`);
        onError?.(error);
        fallbackFn?.();
        reject(error);
      };

      // SRI failure handler
      script.addEventListener(
        "securitypolicyviolation",
        () => {
          clearTimeout(timeoutHandle);
          failedScripts.add(src);
          pendingScripts.delete(src);
          const error = new Error(`SRI validation failed for: ${src}`);
          onError?.(error);
          fallbackFn?.();
          reject(error);
        },
        { once: true }
      );

      document.head.appendChild(script);
    } catch (error) {
      clearTimeout(timeoutHandle);
      failedScripts.add(src);
      pendingScripts.delete(src);
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      fallbackFn?.();
      reject(err);
    }
  });

  pendingScripts.set(src, loadPromise);
  return loadPromise;
}

/**
 * Load multiple scripts in sequence with SRI validation.
 * Stops on first failure and executes fallback.
 */
export async function loadScriptsSequence(
  scripts: SafeScriptConfig[],
  onAllSuccess?: () => void,
  onAnyFailure?: (error: Error, failedScript: SafeScriptConfig) => void
): Promise<void> {
  for (const script of scripts) {
    try {
      await loadSafeScript(script);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onAnyFailure?.(err, script);
      return; // Stop sequence on first failure
    }
  }
  onAllSuccess?.();
}

/**
 * Load multiple scripts in parallel with SRI validation.
 * Returns success if at least one succeeds.
 */
export async function loadScriptsParallel(
  scripts: SafeScriptConfig[],
  minSuccessCount: number = 1
): Promise<SafeScriptConfig[]> {
  const results = await Promise.allSettled(scripts.map(script => loadSafeScript(script)));
  const successCount = results.filter(r => r.status === "fulfilled").length;

  if (successCount < minSuccessCount) {
    throw new Error(
      `Only ${successCount}/${scripts.length} scripts loaded (required: ${minSuccessCount})`
    );
  }

  return scripts.filter((_, i) => results[i].status === "fulfilled");
}

/**
 * Clear script loading cache (useful for testing)
 */
export function clearScriptCache(): void {
  loadedScripts.clear();
  failedScripts.clear();
  pendingScripts.clear();
}
