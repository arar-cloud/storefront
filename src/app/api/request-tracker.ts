import { NextRequest, NextResponse } from 'next/server';
import type { NextMiddleware } from 'next/server';

declare global {
  var __activeRequests: number;
  var __totalRequests: number;
  var __totalErrors: number;
}

globalThis.__activeRequests = 0;
globalThis.__totalRequests = 0;
globalThis.__totalErrors = 0;

export function incrementActiveRequests(): number {
  return ++globalThis.__activeRequests;
}

export function decrementActiveRequests(): number {
  return Math.max(0, --globalThis.__activeRequests);
}

export function incrementTotalRequests(): number {
  return ++globalThis.__totalRequests;
}

export function incrementTotalErrors(): number {
  return ++globalThis.__totalErrors;
}

export function getRequestMetrics() {
  return {
    activeRequests: globalThis.__activeRequests,
    totalRequests: globalThis.__totalRequests,
    totalErrors: globalThis.__totalErrors,
    avgErrorRate: globalThis.__totalRequests > 0
      ? ((globalThis.__totalErrors / globalThis.__totalRequests) * 100).toFixed(2)
      : '0',
  };
}

export function resetMetrics(): void {
  globalThis.__activeRequests = 0;
  globalThis.__totalRequests = 0;
  globalThis.__totalErrors = 0;
}

export function createRequestTrackingWrapper<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: any[]) => {
    incrementActiveRequests();
    incrementTotalRequests();

    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      incrementTotalErrors();
      throw error;
    } finally {
      decrementActiveRequests();
    }
  }) as T;
}
