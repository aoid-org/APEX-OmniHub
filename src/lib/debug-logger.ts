/**
 * Debug logging utility for instrumentation.
 * Hardened: HTTPS-only endpoints, sensitive field redaction, strict prod gate.
 */

const SENSITIVE_KEYS = /token|key|secret|password|auth|cookie|session|credential|bearer/i;

interface LogData {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}

/**
 * Deep-redact sensitive fields from an arbitrary object.
 * Exported for testing.
 */
export function redact<T>(value: T, depth = 0): T {
  if (depth > 10) return '[MAX_DEPTH]' as unknown as T;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value as T;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out as T;
  }
  return value;
}

function validateEndpoint(endpoint: string): void {
  if (!endpoint.startsWith('https://')) {
    throw new Error('Debug logger requires HTTPS endpoint');
  }
  if (/^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i.test(endpoint)) {
    throw new Error('Debug logger cannot target localhost/private IP addresses');
  }
}

/**
 * Send a debug log entry.
 * Silently no-ops in production. Redacts sensitive fields before sending.
 */
export function debugLog({ location, message, data, hypothesisId }: LogData): void {
  // Strict production gate - never active in prod builds
  if (import.meta.env.PROD) {
    return;
  }

  const endpoint = import.meta.env.VITE_DEBUG_LOG_ENDPOINT;

  // No endpoint configured - fall back to console in dev
  if (!endpoint) {
    if (import.meta.env.DEV) console.log('[DebugLog]', location, message, data);
    return;
  }

  try {
    validateEndpoint(endpoint);
  } catch {
    if (import.meta.env.DEV) console.warn('[DebugLog] Invalid endpoint:', endpoint);
    return;
  }

  try {
    const payload = {
      location,
      message,
      data: redact({ ...data, timestamp: Date.now() }),
      timestamp: Date.now(),
      sessionId: globalThis.crypto?.randomUUID() || 'ephemeral-session',
      runId: globalThis.crypto?.randomUUID() || 'ephemeral-run',
      hypothesisId: hypothesisId || 'A',
    };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Non-blocking: silently fail if server unavailable
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Create a scoped debug logger for a specific location.
 */
export function createDebugLogger(location: string, hypothesisId?: string) {
  return (message: string, data?: Record<string, unknown>) => {
    debugLog({ location, message, data, hypothesisId });
  };
}

/**
 * Log an error via the debug logger.
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
