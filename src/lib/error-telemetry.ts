/**
 * Error telemetry and structured logging utilities.
 * Provides correlation IDs and detailed error context for checkout flow debugging.
 */

export interface ErrorTelemetry {
  correlationId: string;
  timestamp: string;
  severity: 'error' | 'warning' | 'info';
  context: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  userId?: string;
  checkoutId?: string;
  sessionId?: string;
}

const telemetryBuffer: ErrorTelemetry[] = [];
const MAX_BUFFER_SIZE = 100;
let correlationIdCounter = 0;

/**
 * Generate unique correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  correlationIdCounter++;
  return `${timestamp}-${random}-${correlationIdCounter}`;
}

/**
 * Log error with structured telemetry.
 */
export function logError(
  message: string,
  context: string,
  options?: {
    correlationId?: string;
    severity?: 'error' | 'warning' | 'info';
    error?: Error;
    metadata?: Record<string, any>;
    userId?: string;
    checkoutId?: string;
    sessionId?: string;
  },
): ErrorTelemetry {
  const telemetry: ErrorTelemetry = {
    correlationId: options?.correlationId || generateCorrelationId(),
    timestamp: new Date().toISOString(),
    severity: options?.severity || 'error',
    context,
    message,
    stack: options?.error?.stack,
    metadata: options?.metadata,
    userId: options?.userId,
    checkoutId: options?.checkoutId,
    sessionId: options?.sessionId,
  };

  // Add to buffer
  telemetryBuffer.push(telemetry);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const style = `color: ${getSeverityColor(telemetry.severity)}`;
    console.log(
      `%c[${telemetry.severity.toUpperCase()}] ${telemetry.context}:`,
      style,
      telemetry.message,
      telemetry,
    );
  }

  // Send to external logging service
  if (typeof window !== 'undefined' && (window as any).__logTelemetry) {
    (window as any).__logTelemetry(telemetry).catch((e: any) => {
      console.error('[Telemetry] Failed to send telemetry:', e);
    });
  }

  return telemetry;
}

/**
 * Log API call with request/response details.
 */
export function logApiCall(
  method: string,
  url: string,
  options?: {
    correlationId?: string;
    status?: number;
    duration?: number;
    error?: Error;
    metadata?: Record<string, any>;
    checkoutId?: string;
  },
): ErrorTelemetry {
  const correlationId = options?.correlationId || generateCorrelationId();
  const message = `${method} ${url} - Status: ${options?.status || 'pending'} (${options?.duration || 0}ms)`;

  return logError(message, 'ApiCall', {
    correlationId,
    severity: options?.status && options.status >= 400 ? 'error' : 'info',
    error: options?.error,
    metadata: {
      method,
      url,
      status: options?.status,
      duration: options?.duration,
      ...options?.metadata,
    },
    checkoutId: options?.checkoutId,
  });
}

/**
 * Log payment transaction event.
 */
export function logPaymentTransaction(
  event: 'initiated' | 'processing' | 'success' | 'failed' | 'retry',
  options?: {
    correlationId?: string;
    gateway?: string;
    amount?: number;
    currency?: string;
    error?: Error;
    metadata?: Record<string, any>;
    checkoutId?: string;
    userId?: string;
  },
): ErrorTelemetry {
  return logError(`Payment transaction ${event}`, 'PaymentTransaction', {
    correlationId: options?.correlationId || generateCorrelationId(),
    severity: event === 'failed' ? 'error' : event === 'success' ? 'info' : 'info',
    error: options?.error,
    metadata: {
      event,
      gateway: options?.gateway,
      amount: options?.amount,
      currency: options?.currency,
      ...options?.metadata,
    },
    checkoutId: options?.checkoutId,
    userId: options?.userId,
  });
}

/**
 * Get all logged telemetry for debugging.
 */
export function getTelemetryBuffer(): ErrorTelemetry[] {
  return [...telemetryBuffer];
}

/**
 * Clear telemetry buffer.
 */
export function clearTelemetryBuffer(): void {
  telemetryBuffer.length = 0;
}

/**
 * Export telemetry for submission to external service.
 */
export function exportTelemetry(): string {
  return JSON.stringify(telemetryBuffer, null, 2);
}

/**
 * Get severity color for console output.
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'error':
      return '#ff0000';
    case 'warning':
      return '#ff9800';
    case 'info':
      return '#2196f3';
    default:
      return '#000000';
  }
}

/**
 * Create error context for wrapped operations.
 */
export function withErrorContext<T>(
  operation: () => Promise<T>,
  context: string,
  options?: {
    checkoutId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  },
): Promise<T> {
  const correlationId = generateCorrelationId();

  return operation()
    .then((result) => {
      logError(`${context} completed successfully`, context, {
        correlationId,
        severity: 'info',
        metadata: options?.metadata,
        checkoutId: options?.checkoutId,
        userId: options?.userId,
      });
      return result;
    })
    .catch((error) => {
      logError(`${context} failed`, context, {
        correlationId,
        severity: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: options?.metadata,
        checkoutId: options?.checkoutId,
        userId: options?.userId,
      });
      throw error;
    });
}
