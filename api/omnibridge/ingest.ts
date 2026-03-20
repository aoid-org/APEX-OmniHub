/**
 * api/omnibridge/ingest.ts — Edge Webhook Ingestion Endpoint
 *
 * Receives inbound webhook events from OmniBridge partners with
 * HMAC-SHA256 signature validation and idempotency enforcement.
 *
 * Security:
 * - HMAC-SHA256 signature verification on every request
 * - Constant-time signature comparison (via Web Crypto)
 * - Payload sanitization (strips unsafe fields)
 * - Idempotency deduplication
 *
 * @module api/omnibridge/ingest
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { validateHMAC } from '../../src/lib/security/hmacValidator';

export const config = { runtime: 'edge' };

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface IngestPayload {
  event_type: string;
  tenant_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  idempotency_key?: string;
}

/* -------------------------------------------------------------------------- */
/*  Idempotency tracker (per-isolate; resets on cold start)                   */
/* -------------------------------------------------------------------------- */

/**
 * In-memory set of processed idempotency keys.
 * For edge runtime this provides best-effort deduplication within a single
 * isolate. Production systems should back this with a distributed store.
 */
const processedKeys = new Set<string>();
const MAX_IDEMPOTENCY_KEYS = 10_000;

/**
 * Check if an idempotency key has already been processed.
 * Returns true if the key is a duplicate.
 */
function isDuplicate(key: string): boolean {
  if (processedKeys.has(key)) {
    return true;
  }

  // Evict oldest entries if we exceed the cap to bound memory
  if (processedKeys.size >= MAX_IDEMPOTENCY_KEYS) {
    const firstKey = processedKeys.values().next().value as string;
    processedKeys.delete(firstKey);
  }

  processedKeys.add(key);
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Validate the ingest payload structure.
 * Returns the parsed payload or null if invalid.
 */
function parsePayload(body: unknown): IngestPayload | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.event_type !== 'string' || obj.event_type.length === 0) return null;
  if (typeof obj.tenant_id !== 'string' || obj.tenant_id.length === 0) return null;
  if (typeof obj.timestamp !== 'string' || obj.timestamp.length === 0) return null;
  if (!obj.payload || typeof obj.payload !== 'object' || Array.isArray(obj.payload)) return null;

  // Validate timestamp is a parseable date
  if (Number.isNaN(Date.parse(obj.timestamp))) return null;

  // Optional idempotency_key must be string if present
  if (obj.idempotency_key !== undefined && typeof obj.idempotency_key !== 'string') return null;

  return {
    event_type: obj.event_type,
    tenant_id: obj.tenant_id,
    timestamp: obj.timestamp,
    payload: obj.payload as Record<string, unknown>,
    idempotency_key: typeof obj.idempotency_key === 'string' ? obj.idempotency_key : undefined,
  };
}

/**
 * Recursively sanitize a payload object:
 * - Remove keys starting with "__" (dunder — potential prototype pollution vectors)
 * - Remove keys whose string values contain "<script" (XSS payloads)
 */
function sanitizePayload(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip dunder keys
    if (key.startsWith('__')) {
      continue;
    }

    // Skip string values containing script tags
    if (typeof value === 'string' && /<script/i.test(value)) {
      continue;
    }

    // Recurse into nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizePayload(item as Record<string, unknown>);
        }
        if (typeof item === 'string' && /<script/i.test(item)) {
          return undefined;
        }
        return item;
      }).filter((item) => item !== undefined);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export default async function handler(request: Request): Promise<Response> {
  // Only POST allowed
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Validate HMAC signature
  const signature = request.headers.get('X-OmniBridge-Signature');
  if (!signature) {
    return jsonResponse(401, { error: 'missing_signature' });
  }

  const webhookSecret = process.env['OMNIBRIDGE_WEBHOOK_SECRET'];
  if (!webhookSecret) {
    console.error('[omnibridge/ingest] OMNIBRIDGE_WEBHOOK_SECRET env var not configured');
    return jsonResponse(500, { error: 'server_error' });
  }

  const signatureValid = await validateHMAC(rawBody, signature, webhookSecret);
  if (!signatureValid) {
    return jsonResponse(401, { error: 'invalid_signature' });
  }

  // Parse and validate payload
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const ingestPayload = parsePayload(parsedBody);
  if (!ingestPayload) {
    return jsonResponse(400, {
      error: 'invalid_payload',
      error_description:
        'Required fields: event_type (string), tenant_id (string), timestamp (ISO string), payload (object)',
    });
  }

  // Generate a unique event ID for tracking
  const eventId = crypto.randomUUID();

  // Idempotency check
  if (ingestPayload.idempotency_key) {
    if (isDuplicate(ingestPayload.idempotency_key)) {
      console.log(
        `[omnibridge/ingest] Duplicate event skipped: idempotency_key=${ingestPayload.idempotency_key}, event_id=${eventId}`,
      );
      // Return success — the original event was already processed
      return jsonResponse(200, { received: true, event_id: eventId, duplicate: true });
    }
  }

  // Sanitize payload
  const sanitizedPayload = sanitizePayload(ingestPayload.payload);

  const sanitizedEvent = {
    event_id: eventId,
    event_type: ingestPayload.event_type,
    tenant_id: ingestPayload.tenant_id,
    timestamp: ingestPayload.timestamp,
    payload: sanitizedPayload,
    idempotency_key: ingestPayload.idempotency_key ?? null,
    received_at: new Date().toISOString(),
  };

  // TODO: Route to Temporal workflow for durable processing
  // await temporalClient.workflow.start('omnibridgeEventHandler', {
  //   taskQueue: 'omnibridge-events',
  //   workflowId: `omni-event-${eventId}`,
  //   args: [sanitizedEvent],
  // });

  // For now, log the sanitized event for observability
  console.log(`[omnibridge/ingest] Event received:`, JSON.stringify(sanitizedEvent));

  return jsonResponse(200, { received: true, event_id: eventId });
}
