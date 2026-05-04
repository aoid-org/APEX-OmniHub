/**
 * Omnibus Gateway Tracer
 * @version 1.0.0
 * @module src/omnihub-gateway/Tracer
 *
 * Integrates OpenTelemetry Node SDK with Jaeger OTLP export via HTTP.
 * Compliant with APEX OBSERVABILITY STACK.
 */

// NODE-ONLY: These packages crash in browser environments.
// Dynamically imported at runtime — bundlers will NOT inline them.
type NodeSDKType = import('@opentelemetry/sdk-node').NodeSDK;
let NodeSDK: (typeof import('@opentelemetry/sdk-node'))['NodeSDK'] | undefined;
let getNodeAutoInstrumentations:
  | typeof import('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations
  | undefined;

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
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

  // Guard: no-op in browser environments
  if (typeof process === 'undefined' || typeof window !== 'undefined') {
    console.warn('[Tracer] initGatewayTracer() called in browser context — no-op.');
    return undefined;
  }

  if (!NodeSDK) {
    const [sdkMod, instrMod] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
    ]);
    NodeSDK = sdkMod.NodeSDK;
    getNodeAutoInstrumentations = instrMod.getNodeAutoInstrumentations;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName || 'omnihub-gateway',
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'production',
  });

  const traceExporter = new OTLPTraceExporter({
    url: config.otlpEndpoint || 'http://localhost:4318/v1/traces', // standard OTLP port
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations!()],
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
