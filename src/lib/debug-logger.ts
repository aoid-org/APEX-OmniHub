/* eslint-disable no-console */
/**
 * Debug logging utility for instrumentation
 * Centralizes logging logic to reduce code duplication
 */

const LOG_ENDPOINT = 'http://127.0.0.1:7245/ingest/42dac81a-117c-4f9f-9adc-d4ba4a181cf2';
const _SESSION_ID = 'debug-session';
const _RUN_ID = 'run2';

interface LogData {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}

/**
 * Send a debug log entry
 * Silently fails if logging server is unavailable
 */
export function debugLog({ location, message, data, hypothesisId }: LogData): void {
  // C1: Safety Gate - No-op in production unless explicitly enabled
  if (import.meta.env.PROD && import.meta.env.VITE_DEBUG_LOGGING !== 'true') {
    return;
  }

  try {
    const payload = {
      location,
      message,
      data: { ...data, timestamp: Date.now() },
      timestamp: Date.now(),
      // Use ephemeral IDs if not provided, don't leak hardcoded session
      sessionId: globalThis.crypto?.randomUUID() || 'ephemeral-session',
      runId: globalThis.crypto?.randomUUID() || 'ephemeral-run',
      hypothesisId: hypothesisId || 'A',
    };

    const endpoint = import.meta.env.VITE_DEBUG_LOG_ENDPOINT || LOG_ENDPOINT;

    // Only fetch if we have a valid endpoint
    if (!endpoint || endpoint.includes('localhost')) {
      if (import.meta.env.DEV) console.log('[DebugLog]', payload);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      if (import.meta.env.DEV) {
        console.error('Log fetch failed:', err);
      }
    });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('Log setup failed:', e);
    }
  }
}

/**
 * Create a debug log wrapper for a specific location
 * Useful for component-level logging
 */
export function createDebugLogger(location: string, hypothesisId?: string) {
  return (message: string, data?: Record<string, unknown>) => {
    debugLog({ location, message, data, hypothesisId });
  };
}

/**
 * Log an error via the debug logger
 * Provides a lightweight fallback when monitoring is unavailable
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const data =
    error instanceof Error
      ? { stack: error.stack, ...context }
      : { error, ...context };

  debugLog({ location: 'logError', message, data });

  if (import.meta.env.DEV) {
    console.error('Debug logError:', error, context);
  }
}
