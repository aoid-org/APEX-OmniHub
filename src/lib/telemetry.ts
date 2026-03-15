/**
 * APEX OmniHub — Frontend Telemetry Bootstrap
 *
 * Initialises:
 *   1. OpenTelemetry Web SDK — distributed trace context propagation (W3C traceparent)
 *   2. Sentry React SDK       — error tracking and performance monitoring
 *
 * Gap closed: 2.1 (zero distributed tracing), 2.3 (silent failure alerting)
 */

import { trace, context, propagation } from '@opentelemetry/api';
import { WebTracerProvider }           from '@opentelemetry/sdk-trace-web';
import { ZoneContextManager }          from '@opentelemetry/context-zone';
import { registerInstrumentations }    from '@opentelemetry/instrumentation';
import { FetchInstrumentation }        from '@opentelemetry/instrumentation-fetch';
import * as Sentry                     from '@sentry/react';

let _initialised = false;

export function initTelemetry(): void {
  if (_initialised || typeof window === 'undefined') return;
  _initialised = true;

  // ── OpenTelemetry ─────────────────────────────────────────────────────────
  const provider = new WebTracerProvider();
  provider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Propagate W3C traceparent headers on all fetch calls to Supabase + Orchestrator
        propagateTraceHeaderCorsUrls: [
          /\.supabase\.co/, // NOSONAR
          /apexomnihub\.icu/, // NOSONAR
          /localhost/, // NOSONAR
        ],
      }),
    ],
  });

  // ── Sentry ─────────────────────────────────────────────────────────────────
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn:         sentryDsn,
      environment: import.meta.env.MODE,
      // Sample 100% of errors, 10% of performance traces in production
      tracesSampleRate:   import.meta.env.PROD ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText:  true,
          blockAllMedia: true,
        }),
      ],
    });
  }
}

/** Expose active tracer for manual spans */
export const tracer = trace.getTracer('apex-omnihub', '1.4.2');

/** Expose context/propagation for Edge Function calls */
export { context, propagation }; // NOSONAR
