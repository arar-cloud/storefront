/**
 * React Performance Utilities
 * Helpers for optimizing component rendering and preventing unnecessary re-renders
 */

import { useMemo, useCallback } from "react";

/**
 * Hook to memoize a list of items, only updating when items actually change
 * Prevents unnecessary re-renders of list components
 */
export function useMemoList<T>(items: T[]): T[] {
  return useMemo(() => items, [JSON.stringify(items)]);
}

/**
 * Hook to create a stable callback that doesn't change on every render
 * Useful for event handlers and list item callbacks
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  return useCallback(callback, []);
}

/**
 * Hook to deduplicate API calls within a render cycle
 * Returns a function that can be called multiple times but only fires once per render
 */
export function useDeduplicatedCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  let pending = false;
  let queued = false;

  return useCallback(
    ((...args: any[]) => {
      if (pending) {
        queued = true;
        return;
      }

      pending = true;
      Promise.resolve().then(() => {
        pending = false;
        if (queued) {
          queued = false;
          callback(...args);
        }
      });

      callback(...args);
    }) as T,
    [callback]
  );
}
