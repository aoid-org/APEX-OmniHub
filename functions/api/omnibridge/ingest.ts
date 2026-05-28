/**
 * CF Pages Function: POST /api/omnibridge/ingest
 *
 * Hardened 5-header HMAC ingress (existing contract, now on CF Pages).
 * Mirrors the prior api/omnibridge/ingest.ts but uses the CF Pages
 * onRequestPost signature + context.env binding. The underlying
 * verification + canonical-string logic is unchanged.
 *
 * @module functions/api/omnibridge/ingest
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { validateHMAC } from '../../../src/lib/security/hmacValidator';

// Inline secure ID generator — avoids pulling in src/lib/security.ts which
// imports the Vite-only @/guardian/loops alias that CF Pages Functions
// bundler (esbuild) cannot resolve. crypto.randomUUID is available in
// the Cloudflare Workers / Pages Functions runtime.
function generateSecureId(): string {
  return crypto.randomUUID();
}
import {
  resolveHardenedSourceFromEnv,
  lastRegistryErrorFromEnv,
} from '../../../src/lib/omnibridge/registryEnv';
import {
  extractHardenedHeaders,
  computeCanonicalString,
  isTimestampValid,
  isIpAllowed,
  extractClientIp,
} from '../../../src/lib/omnibridge/verifySignedIngress';
import {
  replayStore,
  getHardenedReplayKey,
  getLegacyIdempotencyKey,
} from '../../../src/lib/omnibridge/replayStore';
import {
  normalizeHardenedEvent,
  normalizeLegacyEvent,
  type EventEnvelope,
} from '../../../src/lib/omnibridge/eventEnvelope';
import { persistEvent, type EventStoreEnv } from '../../../src/lib/omnibridge/eventStore';
import { jsonResponse, makeLogger, sanitize } from '../../../src/lib/omnibridge/httpUtils';

interface Env extends EventStoreEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET?: string;
  OMNIBRIDGE_WEBHOOK_SECRET?: string;
  [key: string]: string | undefined;
}

type HardenedHeaders = NonNullable<ReturnType<typeof extractHardenedHeaders>>;

const logEvent = makeLogger('omnibridge/ingest');

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isTenantMismatch(parsedBody: Record<string, unknown>, expectedTenantId: string): boolean {
  return !!parsedBody.tenant_id && parsedBody.tenant_id !== expectedTenantId;
}

async function handleHardenedIngress(
  request: Request,
  rawBody: string,
  headers: HardenedHeaders,
  env: Env,
): Promise<Response> {
  const { sourceId, keyId, timestamp, traceId, signature } = headers;
  const meta = { mode: 'hardened' as const, source_id: sourceId, trace_id: traceId };

  if (!isTimestampValid(timestamp, 300)) {
    logEvent(true, 'invalid_timestamp', meta);
    return jsonResponse(400, { error: 'invalid_timestamp' });
  }

  const replayKey = getHardenedReplayKey(sourceId, traceId);
  if (await replayStore.isDuplicate(replayKey)) {
    logEvent(true, 'replay_detected', meta);
    return jsonResponse(409, { error: 'replay_detected' });
  }

  const resolution = resolveHardenedSourceFromEnv(sourceId, keyId, env);
  if (lastRegistryErrorFromEnv(env)) {
    logEvent(true, 'server_config_error', meta);
    return jsonResponse(500, { error: 'server_config_error' });
  }
  if (!resolution) {
    logEvent(true, 'invalid_key_id', meta);
    return jsonResponse(401, { error: 'invalid_key_id' });
  }

  const trustProxy = env.OMNIBRIDGE_TRUST_PROXY === 'true';
  const clientIp = extractClientIp(request, trustProxy);
  if (!isIpAllowed(clientIp, resolution.webhook.allowed_ips)) {
    logEvent(true, 'ip_not_allowed', { ...meta, client_ip: clientIp });
    return jsonResponse(403, { error: 'ip_not_allowed' });
  }

  const path = new URL(request.url).pathname;
  const canonical = await computeCanonicalString(request.method, path, timestamp, traceId, sourceId, rawBody);
  if (!(await validateHMAC(canonical, signature, resolution.secret))) {
    logEvent(true, 'invalid_signature', meta);
    return jsonResponse(401, { error: 'invalid_signature' });
  }

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    logEvent(true, 'invalid_json', meta);
    return jsonResponse(400, { error: 'invalid_json' });
  }

  let eventEnvelope: EventEnvelope;
  try {
    const idempotencyKey = typeof parsedBody.idempotency_key === 'string'
      ? parsedBody.idempotency_key
      : undefined;
    eventEnvelope = normalizeHardenedEvent(
      parsedBody,
      resolution.client.tenant_id,
      timestamp,
      traceId,
      sourceId,
      generateSecureId(),
      idempotencyKey,
    );
  } catch (e) {
    logEvent(true, 'invalid_payload', { ...meta, error: toErrorMessage(e) });
    return jsonResponse(400, { error: 'invalid_payload' });
  }

  if (isTenantMismatch(parsedBody, resolution.client.tenant_id)) {
    logEvent(true, 'tenant_mismatch', meta);
    return jsonResponse(403, { error: 'tenant_mismatch' });
  }

  eventEnvelope.payload = sanitize(eventEnvelope.payload);

  const persist = await persistEvent({
    event_id: eventEnvelope.event_id,
    source_id: sourceId,
    tenant_id: resolution.client.tenant_id,
    profile: 'hardened',
    event_type: eventEnvelope.event_type,
    trace_id: eventEnvelope.trace_id,
    idempotency_key: eventEnvelope.idempotency_key,
    payload: eventEnvelope.payload,
    raw_headers: {
      'x-omni-source': sourceId,
      'x-omni-key-id': keyId,
      'x-omni-timestamp': timestamp,
      'x-omni-trace-id': traceId,
    },
    signature_verified: true,
  }, env);

  if (!persist.ok) {
    if (persist.reason === 'config_missing') {
      logEvent(false, 'event_received_no_store', meta);
      return jsonResponse(200, { received: true, event_id: eventEnvelope.event_id, stored: false });
    }
    logEvent(true, `persist_failed:${persist.reason}`, { ...meta, detail: persist.detail });
    return jsonResponse(502, { error: 'persist_failed', reason: persist.reason });
  }

  logEvent(false, persist.duplicate ? 'idempotent_accept' : 'event_persisted', { ...meta, event_uuid: persist.event_uuid });
  return jsonResponse(200, {
    received: true,
    event_id: eventEnvelope.event_id,
    event_uuid: persist.event_uuid,
    duplicate: persist.duplicate,
  });
}

async function handleLegacyIngress(request: Request, rawBody: string, env: Env): Promise<Response> {
  const allowLegacy = env.OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET === 'true';
  if (!allowLegacy) {
    const hasAnyHardened = request.headers.has('X-Omni-Source') || request.headers.has('X-Omni-Key-Id');
    if (hasAnyHardened) {
      return jsonResponse(401, { error: 'missing_signature' });
    }
    return jsonResponse(403, { error: 'legacy_mode_disabled' });
  }

  const legacySignature = request.headers.get('X-OmniBridge-Signature');
  if (!legacySignature) return jsonResponse(401, { error: 'missing_signature' });

  const webhookSecret = env.OMNIBRIDGE_WEBHOOK_SECRET;
  if (!webhookSecret) return jsonResponse(500, { error: 'server_config_error' });

  if (!(await validateHMAC(rawBody, legacySignature, webhookSecret))) {
    return jsonResponse(401, { error: 'invalid_signature' });
  }

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  let envelope: EventEnvelope;
  try {
    envelope = normalizeLegacyEvent(parsedBody, generateSecureId());
  } catch (e) {
    return jsonResponse(400, { error: 'invalid_payload', detail: e instanceof Error ? e.message : String(e) });
  }

  if (envelope.idempotency_key) {
    const key = getLegacyIdempotencyKey(envelope.idempotency_key);
    if (await replayStore.isDuplicate(key)) {
      return jsonResponse(200, { received: true, event_id: envelope.event_id, duplicate: true });
    }
  }

  envelope.payload = sanitize(envelope.payload);
  return jsonResponse(200, { received: true, event_id: envelope.event_id });
}

type OnRequestPost = (context: { request: Request; env: Env }) => Promise<Response>;

export const onRequestPost: OnRequestPost = async ({ request, env }) => {
  const rawBody = await request.text();
  const hardenedHeaders = extractHardenedHeaders(request);

  if (hardenedHeaders) {
    return handleHardenedIngress(request, rawBody, hardenedHeaders, env);
  }
  return handleLegacyIngress(request, rawBody, env);
};

type OnRequest = (context: { request: Request; env: Env }) => Promise<Response>;
export const onRequest: OnRequest = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }
  return onRequestPost({ request, env });
};
