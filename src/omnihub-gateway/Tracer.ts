/**
 * Omnibus Gateway Tracer
 * @version 1.0.0
 * @module src/omnihub-gateway/Tracer
 *
 * Integrates OpenTelemetry Node SDK with Jaeger OTLP export via HTTP.
 * Compliant with APEX OBSERVABILITY STACK.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, Tracer, Span } from '@opentelemetry/api';

export interface TracerConfig {
  enabled: boolean;
  serviceName?: string;
  otlpEndpoint?: string; // Jaeger HTTP receiver endpoint
}

let sdk: NodeSDK | null = null;
let initialized = false;

/**
 * Initializes the OpenTelemetry Node SDK if enabled.
 * Should be called once at application startup.
 */
export function initGatewayTracer(config: TracerConfig): NodeSDK | undefined {
  if (!config.enabled || initialized) {
    return undefined;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName || 'omnihub-gateway',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
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
