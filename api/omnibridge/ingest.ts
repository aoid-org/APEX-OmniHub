/**
 * api/omnibridge/ingest.ts — Edge Webhook Ingestion Endpoint
 *
 * Receives inbound webhook events from OmniBridge partners.
 * Supports a source-aware hardened mode (for SBBL HQ and new partners)
 * and optionally a legacy single-secret fallback.
 *
 * Security:
 * - Source registry lookups and validation
 * - Replay prevention via ReplayStore
 * - HMAC-SHA256 signature verification (constant-time)
 * - Payload sanitization (XSS and prototype pollution mitigation)
 *
 * @module api/omnibridge/ingest
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { validateHMAC } from '../../src/lib/security/hmacValidator';
import {
  resolveWebhookSource,
  getRegistryError
} from '../../src/lib/omnibridge/sourceRegistry';
import {
  extractHardenedHeaders,
  computeCanonicalString,
  isTimestampValid,
  isIpAllowed,
  extractClientIp
} from '../../src/lib/omnibridge/verifySignedIngress';
import {
  replayStore,
  getHardenedReplayKey,
  getLegacyIdempotencyKey
} from '../../src/lib/omnibridge/replayStore';
import {
  normalizeHardenedEvent,
  normalizeLegacyEvent,
  type EventEnvelope
} from '../../src/lib/omnibridge/eventEnvelope';

export const config = { runtime: 'edge' };

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
 * Log structure for tracking accept/deny paths cleanly without leaking auth material.
 */
function logEvent(deny: boolean, reason: string, meta: { mode: 'hardened' | 'legacy', source_id?: string, tenant_id?: string, trace_id?: string, error?: string }) {
  const prefix = `[omnibridge/ingest][${meta.mode}]`;
  if (deny) {
    console.error(`${prefix} DENY: ${reason} | ${JSON.stringify(meta)}`);
  } else {
    console.warn(`${prefix} ACCEPT: ${reason} | ${JSON.stringify(meta)}`);
  }
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

  // Always read raw body first for signature verification
  const rawBody = await request.text();

  // Try extracting hardened headers first
  const hardenedHeaders = extractHardenedHeaders(request);

  if (hardenedHeaders) {
    /* ---------------------------------------------------------------------- */
    /*  HARDENED MODE PATH                                                    */
    /* ---------------------------------------------------------------------- */
    const { sourceId, keyId, timestamp, traceId, signature } = hardenedHeaders;
    const modeMeta = { mode: 'hardened' as const, source_id: sourceId, trace_id: traceId };

    // Basic format validations
    if (!isTimestampValid(timestamp, 300)) {
      logEvent(true, 'invalid_timestamp', modeMeta);
      return jsonResponse(400, { error: 'invalid_timestamp' });
    }

    // Replay check before heavy crypto
    const replayKey = getHardenedReplayKey(sourceId, traceId);
    if (replayStore.isDuplicate(replayKey)) {
      logEvent(true, 'replay_detected', modeMeta);
      return jsonResponse(409, { error: 'replay_detected' });
    }

    // Lookup Source
    const resolution = resolveWebhookSource(sourceId, keyId);

    // Check if there was a server error reading config
    if (getRegistryError()) {
      logEvent(true, 'server_config_error', { ...modeMeta, error: getRegistryError()?.message });
      return jsonResponse(500, { error: 'server_config_error' });
    }

    if (!resolution) {
      logEvent(true, 'invalid_key_id', modeMeta);
      return jsonResponse(401, { error: 'invalid_key_id' }); // Generic error to hide inner workings
    }

    // IP validation (if configured)
    const clientIp = extractClientIp(request);
    if (!isIpAllowed(clientIp, resolution.webhook.allowed_ips)) {
      logEvent(true, 'ip_not_allowed', { ...modeMeta, error: `IP ${clientIp} not in allowed_ips` });
      return jsonResponse(403, { error: 'ip_not_allowed' });
    }

    // Verify HMAC
    const path = new URL(request.url).pathname;

    // Create canonical string matching _shared/requestSigning.ts pattern but with sourceId prepended
    // METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + TRACE_ID + "\n" + SOURCE_ID + "\n" + SHA256_HEX(BODY)
    const canonicalStr = await computeCanonicalString(
      request.method,
      path,
      timestamp,
      traceId,
      sourceId,
      rawBody
    );

    const signatureValid = await validateHMAC(canonicalStr, signature, resolution.secret);
    if (!signatureValid) {
      logEvent(true, 'invalid_signature', modeMeta);
      return jsonResponse(401, { error: 'invalid_signature' });
    }

    // Payload parsing
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      logEvent(true, 'invalid_json', modeMeta);
      return jsonResponse(400, { error: 'invalid_json' });
    }

    // Normalize and enforce tenant matching
    let eventEnvelope: EventEnvelope;
    try {
      const eventId = crypto.randomUUID();
      eventEnvelope = normalizeHardenedEvent(
        parsedBody,
        resolution.client.tenant_id,
        timestamp,
        traceId,
        sourceId,
        eventId,
        typeof parsedBody.idempotency_key === 'string' ? parsedBody.idempotency_key : undefined
      );
    } catch (e) {
      logEvent(true, 'invalid_payload', { ...modeMeta, error: e instanceof Error ? e.message : String(e) });
      return jsonResponse(400, { error: 'invalid_payload' });
    }

    // Optional legacy payload tenant_id strict checking against registry (if payload provided it)
    if (parsedBody.tenant_id && parsedBody.tenant_id !== resolution.client.tenant_id) {
      logEvent(true, 'tenant_mismatch', { ...modeMeta, tenant_id: parsedBody.tenant_id as string });
      return jsonResponse(403, { error: 'tenant_mismatch' });
    }

    // Pre-process sanitization
    eventEnvelope.payload = sanitizePayload(eventEnvelope.payload);

    logEvent(false, 'event_received', { ...modeMeta, tenant_id: resolution.client.tenant_id });

    // FUTURE: Durable execution routing
    return jsonResponse(200, { received: true, event_id: eventEnvelope.event_id });

  } else {
    /* ---------------------------------------------------------------------- */
    /*  LEGACY MODE PATH                                                      */
    /* ---------------------------------------------------------------------- */
    const modeMeta = { mode: 'legacy' as const };

    const allowLegacy = process.env['OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET'] === 'true';
    if (!allowLegacy) {
      // If we got here, they lacked the hardened headers. Determine why.
      const hasAnyHardened = request.headers.has('X-Omni-Source') || request.headers.has('X-Omni-Key-Id');
      if (hasAnyHardened) {
        logEvent(true, 'missing_signature', modeMeta);
        return jsonResponse(401, { error: 'missing_signature' }); // missing one of the 5
      }

      logEvent(true, 'legacy_mode_disabled', modeMeta);
      return jsonResponse(403, { error: 'legacy_mode_disabled' });
    }

    const legacySignature = request.headers.get('X-OmniBridge-Signature');
    if (!legacySignature) {
      logEvent(true, 'missing_signature', modeMeta);
      return jsonResponse(401, { error: 'missing_signature' });
    }

    const webhookSecret = process.env['OMNIBRIDGE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      logEvent(true, 'server_config_error', { ...modeMeta, error: 'OMNIBRIDGE_WEBHOOK_SECRET missing' });
      return jsonResponse(500, { error: 'server_config_error' });
    }

    const signatureValid = await validateHMAC(rawBody, legacySignature, webhookSecret);
    if (!signatureValid) {
      logEvent(true, 'invalid_signature', modeMeta);
      return jsonResponse(401, { error: 'invalid_signature' });
    }

    // Payload Parsing
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      logEvent(true, 'invalid_json', modeMeta);
      return jsonResponse(400, { error: 'invalid_json' });
    }

    // Normalization & Validation
    const eventId = crypto.randomUUID();
    let eventEnvelope: EventEnvelope;
    try {
      eventEnvelope = normalizeLegacyEvent(parsedBody, eventId);
    } catch (e) {
      logEvent(true, 'invalid_payload', { ...modeMeta, error: e instanceof Error ? e.message : String(e) });
      return jsonResponse(400, { error: 'invalid_payload' });
    }

    // Idempotency check for Legacy
    if (eventEnvelope.idempotency_key) {
      const replayKey = getLegacyIdempotencyKey(eventEnvelope.idempotency_key);
      if (replayStore.isDuplicate(replayKey)) {
        logEvent(true, 'replay_detected', { ...modeMeta, trace_id: eventEnvelope.idempotency_key });
        return jsonResponse(200, { received: true, event_id: eventId, duplicate: true });
      }
    }

    eventEnvelope.payload = sanitizePayload(eventEnvelope.payload);

    logEvent(false, 'event_received', { ...modeMeta, tenant_id: eventEnvelope.tenant_id });

    // Match the previous legacy endpoint response
    return jsonResponse(200, { received: true, event_id: eventId });
  }
}
