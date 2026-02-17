/**
 * Production monitoring and observability utilities
 * Integrates with Sentry dynamically (no hard dependency) when DSN is provided.
 * Includes OmniSentry for client-side self-healing monitoring.
 */

import { appConfig, getEnvironment } from './config';
import { createDebugLogger } from './debug-logger';
import { initializeOmniSentry, getHealthStatus } from './omni-sentry';
import { MonitoringQueue, simpleHash } from './monitoring-queue';
import { LocalStorageAdapter } from './storage-adapter';

// Re-export OmniSentry for external access
export { getHealthStatus, reportError as reportOmniError, withResilience } from './omni-sentry';

let sentry: unknown = null;
let sentryInitialized = false;

// Batching configuration
const FLUSH_INTERVAL = 2000;
const FLUSH_THRESHOLD = 50;
const MAX_QUEUE_SIZE = 500;

interface QueuedLog {
  key: string;
  entry: unknown;
  max: number;
}

const storage = new LocalStorageAdapter();
const queue = new MonitoringQueue<QueuedLog>(MAX_QUEUE_SIZE, (item) =>
  simpleHash(`${item.key}:${JSON.stringify(item.entry)}`)
);

let flushHandle: unknown | null = null;
let isIdleCallback = false;

export interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceEvent {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

async function ensureSentry() {
  if (sentryInitialized || sentry) return sentry;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return null;

  try {
    // Dynamic import from CDN - TypeScript can't resolve these at compile time
     
    sentry = await import('https://esm.sh/@sentry/browser@7.120.1');
     
    const { BrowserTracing } = await import('https://esm.sh/@sentry/tracing@7.120.1');

     
    sentry.init({
      dsn,
      environment: getEnvironment(),
      release: `${appConfig.name}@${appConfig.version}`,
       
      integrations: [new BrowserTracing()],
      tracesSampleRate: 0.2,
    });
    sentryInitialized = true;
    if (import.meta.env.DEV) {
      console.log('✅ Sentry monitoring initialized');
    }
  } catch (error) {
    console.warn('Sentry initialization failed; continuing without Sentry', error);
  }

  return sentry;
}

/**
 * Persist log using batching queue
 */
function persistLog(key: string, entry: unknown, max: number) {
  // Check criticality - bypass queue for critical errors or security events if system is critical
  const isCritical = key === 'error_logs' || key === 'security_logs';
  const health = getHealthStatus();

  if (isCritical || health.status === 'critical') {
    // Write immediately for critical items
    directWrite(key, [entry], max);
    return;
  }

  queue.push({ key, entry, max });

  // Adaptive flush logic
  if (queue.size >= FLUSH_THRESHOLD) {
    flushQueue();
  } else if (!flushHandle) {
    scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushHandle) return;

  if ('requestIdleCallback' in globalThis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flushHandle = (globalThis as any).requestIdleCallback(() => flushQueue(), { timeout: FLUSH_INTERVAL });
    isIdleCallback = true;
  } else {
    flushHandle = setTimeout(() => {
      flushHandle = null;
      isIdleCallback = false;
      flushQueue();
    }, FLUSH_INTERVAL);
    isIdleCallback = false;
  }
}

function flushQueue() {
  const items = queue.flush();
  if (items.length === 0) {
    // Even if empty, ensure we clear handle if we were called
    // But if called from callback, flushHandle might still be set?
    // If called manually, we want to cancel pending.
    // If called by callback, handle is "done".
    // Let's just always clear handle if we are running.
    clearFlushHandle();
    return;
  }

  clearFlushHandle();

  // Group by key to minimize IO
  const groups = new Map<string, { entries: unknown[], max: number }>();

  for (const item of items) {
    const group = groups.get(item.key) || { entries: [], max: item.max };
    group.entries.push(item.entry);
    // Use the smallest max found to be safe, or just the last one
    group.max = item.max;
    groups.set(item.key, group);
  }

  for (const [key, group] of groups) {
    directWrite(key, group.entries, group.max);
  }
}

function clearFlushHandle() {
  if (flushHandle) {
    if (isIdleCallback && 'cancelIdleCallback' in globalThis) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).cancelIdleCallback(flushHandle);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clearTimeout(flushHandle as any);
    }
    flushHandle = null;
    isIdleCallback = false;
  }
}

/**
 * Direct write to storage (bypassing or processing queue)
 */
function directWrite(key: string, newEntries: unknown[], max: number) {
  try {
    const existingJson = storage.getItem(key) || '[]';
    const logs = JSON.parse(existingJson);

    logs.push(...newEntries);

    // Truncate if needed
    if (logs.length > max) {
      // Remove from the beginning (oldest)
      logs.splice(0, logs.length - max);
    }

    storage.setItem(key, JSON.stringify(logs));
  } catch {
    // non-fatal
  }
}

/**
 * Log error to monitoring service
 */
export async function logError(error: Error, context?: ErrorContext): Promise<void> {
  if (import.meta.env.DEV) {
    console.error('🚨 Error:', error.message, context);
  }

  const entry = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  persistLog('error_logs', entry, 50);

  const s = await ensureSentry();
  if (s?.captureException) {
    s.captureException(error, { extra: context });
  }
}

/**
 * Log performance event
 */
export function logPerformance(event: PerformanceEvent): void {
  if (import.meta.env.DEV) {
    console.log('📊 Performance:', event);
  }
  persistLog('perf_logs', event, 100);
}

/**
 * Log analytics event
 */
export async function logAnalyticsEvent(
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (import.meta.env.DEV) {
    console.log('📈 Analytics:', eventName, properties);
  }

  const s = await ensureSentry();
  if (s?.addBreadcrumb) {
    s.addBreadcrumb({
      category: 'analytics',
      message: eventName,
      data: properties,
      level: 'info',
    });
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: 'auth_failed' | 'rate_limit' | 'suspicious_activity' | 'csrf_attempt',
  details?: Record<string, unknown>
): Promise<void> {
  if (import.meta.env.DEV) {
    console.warn('🔒 Security Event:', eventType, details);
  }

  const entry = {
    type: eventType,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };
  persistLog('security_logs', entry, 100);

  const s = await ensureSentry();
  if (s?.addBreadcrumb) {
    s.addBreadcrumb({
      category: 'security',
      message: eventType,
      data: details,
      level: 'warning',
    });
  }
}

/**
 * Track user action
 */
export function trackUserAction(
  action: string,
  metadata?: Record<string, unknown>
): void {
  void logAnalyticsEvent('user_action', { action, ...metadata });
}

/**
 * Initialize monitoring on app start
 */
export function initializeMonitoring(): void {
  const log = createDebugLogger('monitoring.ts', 'A');
  
  // #region agent log
  log('initializeMonitoring entry');
  // #endregion
  
  try {
    // Initialize OmniSentry if enabled via UI toggle (localStorage)
    const omniSentryEnabled = (() => {
      try {
        return localStorage.getItem('omni_sentry_enabled') === 'true';
      } catch {
        return false;
      }
    })();
    
    if (omniSentryEnabled) {
      initializeOmniSentry();
    }
    
    void ensureSentry();

    // Register flush handlers
    if (typeof window !== 'undefined') {
      const flushHandler = () => flushQueue();
      // Use pagehide for modern browsers as it is more reliable than beforeunload
      window.addEventListener('pagehide', flushHandler);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          flushHandler();
        }
      });
      // Fallback
      window.addEventListener('beforeunload', flushHandler);
    }

    // #region agent log
    log('Before error handlers');
    // #endregion

    // Set up global error handler
    globalThis.addEventListener('error', (event) => {
      // #region agent log
      log('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      });
      // #endregion
      logError(new Error(event.message), {
        route: globalThis.location.pathname,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Set up unhandled promise rejection handler
    globalThis.addEventListener('unhandledrejection', (event) => {
      // #region agent log
      log('Unhandled promise rejection', {
        reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      });
      // #endregion
      const errorMessage = event.reason instanceof Error ? event.reason.message : String(event.reason);
      logError(new Error(errorMessage), {
        route: globalThis.location.pathname,
        metadata: { type: 'unhandled_promise' },
      });
    });

    // #region agent log
    log('Monitoring initialized successfully');
    // #endregion
    if (import.meta.env.DEV) {
      console.log('✅ Monitoring initialized');
    }
  } catch (error) {
    // #region agent log
    log('Monitoring initialization error', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    // #endregion
    console.error('Failed to initialize monitoring:', error);
  }
}

/**
 * Get all error logs (for debugging)
 */
export function getErrorLogs(): unknown[] {
  try {
    return JSON.parse(storage.getItem('error_logs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Get all security logs (for debugging)
 */
export function getSecurityLogs(): unknown[] {
  try {
    return JSON.parse(storage.getItem('security_logs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  storage.removeItem('error_logs');
  storage.removeItem('security_logs');
  storage.removeItem('perf_logs');
  queue.clear();
  if (import.meta.env.DEV) {
    console.log('🗑️ Logs cleared');
  }
}

// Export for testing
export const _testing = {
  flushQueue,
  queue,
  storage
};
