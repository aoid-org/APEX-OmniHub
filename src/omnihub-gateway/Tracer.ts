/**
 * Omnibus Gateway Tracer
 * @version 1.0.0
 * @module src/omnihub-gateway/Tracer
 *
 * Integrates OpenTelemetry Node SDK with Jaeger OTLP export via HTTP.
 * Compliant with APEX OBSERVABILITY STACK.
 */

// Type-only import — erased by TypeScript at compile time, never reaches browser bundle.
import type { NodeSDK as NodeSDKType } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating';
import { trace, SpanStatusCode, Tracer, Span } from '@opentelemetry/api';

export interface TracerConfig {
  enabled: boolean;
  serviceName?: string;
  otlpEndpoint?: string; // Jaeger HTTP receiver endpoint
}

let sdk: NodeSDKType | null = null;
let initialized = false;

/**
 * Initializes the OpenTelemetry Node SDK if enabled.
 * Should be called once at application startup (Node context only).
 */
export async function initGatewayTracer(config: TracerConfig): Promise<NodeSDKType | undefined> {
  if (!config.enabled || initialized) {
    return undefined;
  }

  // Guard: no-op in browser environments — avoids crashing if accidentally called client-side.
  if (typeof process === 'undefined' || globalThis.window !== undefined) {
    console.warn('[Tracer] initGatewayTracer() called in browser context — no-op.');
    return undefined;
  }

  // NODE-ONLY: Lazily imported so bundlers see only a dynamic import(), not a static one.
  // This prevents @opentelemetry/sdk-node and auto-instrumentations-node from entering
  // the browser bundle even if this file is reachable from browser code paths.
  const [{ NodeSDK }, { getNodeAutoInstrumentations }] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/auto-instrumentations-node'),
  ]);

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName || 'omnihub-gateway',
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'production',
  });

  const traceExporter = new OTLPTraceExporter({
    url: config.otlpEndpoint || 'http://localhost:4318/v1/traces', // standard OTLP port
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Since we might be inside a synchronous init flow, handle gracefully
  try {
    sdk.start();
    initialized = true;
  } catch (err) {
    console.error('Failed to start OpenTelemetry NodeSDK', err);
  }

  return sdk;
}

/**
 * Get the underlying gateway tracer instance
 */
export function getGatewayTracer(): Tracer {
  return trace.getTracer('omnihub-gateway');
}

/**
 * Wraps an async function inside a gateway span
 */
export async function withGatewaySpan<T>(
  name: string,
  attributes: Record<string, string>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getGatewayTracer();

  return tracer.startActiveSpan(name, async (span) => {
    // Inject custom attributes
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
