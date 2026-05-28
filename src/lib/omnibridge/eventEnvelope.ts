/**
 * Event Envelope Normalization for OmniBridge
 *
 * Runtime-safe helper to normalize incoming payload shapes into a predictable
 * structured event. This preserves inbound tracing, idempotency, and tenant identifiers,
 * ensuring failure on malformed input.
 *
 * Designed to replace or standardize the legacy direct parsing from ingest.ts.
 *
 * @module lib/omnibridge/eventEnvelope
 * @license Proprietary - APEX Business Systems Ltd.
 */

export type DeliveryStatus = 'accepted' | 'normalized' | 'persisted' | 'dispatched' | 'failed_retryable' | 'failed_terminal';

export interface EventEnvelope {
  event_id: string;
  event_type: string;
  tenant_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  trace_id: string | null;
  source_id: string | null;
  received_at: string;
  delivery_status: DeliveryStatus;
}

/**
 * Normalizes a hardened payload into the standard EventEnvelope.
 */
export function normalizeHardenedEvent(
  rawPayload: Record<string, unknown>,
  tenantId: string,
  timestamp: string,
  traceId: string,
  sourceId: string,
  eventId: string,
  idempotencyKey?: string
): EventEnvelope {
  // We trust the tenant_id from the registry match, rather than the payload body for hardened routes
  // But we still require the payload to at least have an event_type.
  if (typeof rawPayload.event_type !== 'string' || !rawPayload.event_type) {
    throw new Error('FAIL_CLOSED: Missing event_type in hardened payload');
  }

  return {
    event_id: eventId,
    event_type: rawPayload.event_type,
    tenant_id: tenantId, // Strict match from registry overrides payload tenant
    timestamp,
    payload: rawPayload.payload && typeof rawPayload.payload === 'object' && !Array.isArray(rawPayload.payload)
             ? (rawPayload.payload as Record<string, unknown>)
             : rawPayload, // Default to the whole body if it doesn't wrap inside "payload"
    idempotency_key: idempotencyKey ?? null,
    trace_id: traceId,
    source_id: sourceId,
    received_at: new Date().toISOString(),
    delivery_status: 'normalized'
  };
}

/**
 * Normalizes a legacy payload into the standard EventEnvelope.
 */
export function normalizeLegacyEvent(
  rawPayload: Record<string, unknown>,
  eventId: string
): EventEnvelope {
  if (typeof rawPayload.event_type !== 'string' || !rawPayload.event_type) {
    throw new Error('FAIL_CLOSED: Missing event_type in legacy payload');
  }
  if (typeof rawPayload.tenant_id !== 'string' || !rawPayload.tenant_id) {
    throw new Error('FAIL_CLOSED: Missing tenant_id in legacy payload');
  }
  if (typeof rawPayload.timestamp !== 'string' || !rawPayload.timestamp) {
    throw new Error('FAIL_CLOSED: Missing timestamp in legacy payload');
  }
  if (!rawPayload.payload || typeof rawPayload.payload !== 'object' || Array.isArray(rawPayload.payload)) {
    throw new Error('FAIL_CLOSED: Missing or invalid payload object in legacy payload');
  }

  // Validate timestamp is a parseable date
  if (Number.isNaN(Date.parse(rawPayload.timestamp))) {
    throw new Error('FAIL_CLOSED: Invalid timestamp format'); // NOSONAR
  }

  let idempotencyKey: string | null = null;
  if (rawPayload.idempotency_key !== undefined) {
    if (typeof rawPayload.idempotency_key !== 'string') {
      throw new Error('FAIL_CLOSED: idempotency_key must be a string'); // NOSONAR
    }
    idempotencyKey = rawPayload.idempotency_key;
  }

  return {
    event_id: eventId,
    event_type: rawPayload.event_type,
    tenant_id: rawPayload.tenant_id,
    timestamp: rawPayload.timestamp,
    payload: rawPayload.payload as Record<string, unknown>,
    idempotency_key: idempotencyKey,
    trace_id: null,
    source_id: null,
    received_at: new Date().toISOString(),
    delivery_status: 'normalized'
  };
}
