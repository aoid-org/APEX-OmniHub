/**
 * APEX-OmniHub - Centralized Tracing & Span Engine
 * Handles telemetry boundaries for sub-systems with required safe attributes.
 */

import { v4 as uuidv4 } from 'uuid';

export type SubsystemModule = 
  | 'SupabaseDB'
  | 'SupabaseAPI'
  | 'EdgeRequest'
  | 'OmniLink'
  | 'OmniBridge'
  | 'OmniConnect'
  | 'BYOM'
  | 'Web3'
  | 'PhysiOmni'
  | 'SyncImport';

export type PolicyDecision = 'ALLOW' | 'DENY' | 'SIMULATE' | 'DRY_RUN' | 'PENDING';
export type StateKind = 'MUTATION' | 'QUERY' | 'IDEMPOTENT_REPLAY' | 'TRANSACTION' | 'UNKNOWN';

export interface SpanAttributes {
  tenantId?: string;
  actorId?: string;
  action: string;
  module: SubsystemModule;
  idempotencyHash?: string;
  policyDecision?: PolicyDecision;
  stateKind: StateKind;
  [key: string]: unknown;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  attributes: SpanAttributes;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'OK' | 'ERROR';
  error?: Error;
}

// In-memory trace sink for tests and simple local collection
const spanSink: Span[] = [];

/**
 * Simple hash mechanism to redact IDs
 */
export function redactId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  // Use a pseudo-anonymization format for safe logs
  return `redacted-${id.substring(0, 8)}...`;
}

export function startSpan(attributes: SpanAttributes, parentSpanId?: string, traceId?: string): Span {
  const span: Span = {
    traceId: traceId || uuidv4(),
    spanId: uuidv4(),
    parentSpanId,
    startTime: performance.now(),
    status: 'OK',
    attributes: {
      ...attributes,
      tenantId: redactId(attributes.tenantId),
      actorId: redactId(attributes.actorId),
    }
  };
  return span;
}

export function endSpan(span: Span, error?: Error): Span {
  span.endTime = performance.now();
  span.durationMs = span.endTime - span.startTime;
  
  if (error) {
    span.status = 'ERROR';
    span.error = error;
  }

  // Push to sink
  spanSink.push(span);

  return span;
}

/**
 * Wrapper for executing an async function within a traced span boundary.
 */
export async function withSpan<T>(
  attributes: SpanAttributes,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = startSpan(attributes);
  try {
    const result = await fn(span);
    endSpan(span);
    return result;
  } catch (error) {
    endSpan(span, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export function getCollectedSpans(): Span[] {
  return spanSink;
}

export function clearCollectedSpans(): void {
  spanSink.length = 0;
}
