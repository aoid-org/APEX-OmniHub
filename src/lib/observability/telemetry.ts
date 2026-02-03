/* VALUATION_IMPACT: Wraps OpenTelemetry for tenant-aware observability in ops runbooks */
/* Generated: 2026-02-03 */
import { Context, Span, trace, Tracer } from '@opentelemetry/api';

interface TelemetryContext {
  tenantId: string;
  traceId: string;
  [key: string]: unknown;
}

export class TelemetryProvider {
  private tracer: Tracer | null = null;
  private spans = new Map<string, Span>();

  /** Configure tracer instance prior to logging. */
  public init(): void {
    this.tracer = trace.getTracer('apex-telemetry');
  }

  /** Emit a contextual event. */
  public logEvent(event: string, context: TelemetryContext): void {
    this.ensureContext(context);
    const span = this.tracer?.startSpan(event) ?? null;
    span?.setAttributes({ ...context, event });
    span?.end();
  }

  /** Log errors tied to tenant metadata. */
  public logError(error: Error, context: TelemetryContext): void {
    this.ensureContext(context);
    const span = this.tracer?.startSpan('error', undefined, Context.ROOT_CONTEXT) ?? null;
    if (span !== null) {
      span.recordException(error);
      span.setAttribute('error.message', error.message);
      span.end();
    }
  }

  /** Start a span and return its identifier. */
  public startSpan(name: string, attributes: Record<string, string>, context: TelemetryContext): string {
    this.ensureContext(context);
    const span = this.tracer?.startSpan(name, { attributes }) ?? null;
    if (span === null) {
      throw new Error('Telemetry tracer is not initialized');
    }
    const spanId = span.spanContext().spanId;
    this.spans.set(spanId, span);
    return spanId;
  }

  /** End a previously started span. */
  public endSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (span === undefined) {
      throw new Error(`Span ${spanId} not found`);
    }
    span.end();
    this.spans.delete(spanId);
  }

  private ensureContext(context: TelemetryContext): void {
    if (!context.tenantId || !context.traceId) {
      throw new Error('Telemetry context requires tenantId and traceId');
    }
  }
}

export const telemetry = new TelemetryProvider();
