/**
 * CF Pages Function: POST /api/omnibridge/sync
 *
 * SBBL-HQ native sync packet ingress. Cloudflare Pages Functions runtime.
 * Equivalent to the previous api/omnibridge/sync.ts (Vercel Edge) — same
 * verification pipeline, but rebound to CF Pages's onRequestPost signature
 * and context.env binding.
 *
 * Bindings required (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   OMNIBRIDGE_M2M_CLIENTS                       (registry JSON)
 *   OMNIBRIDGE_SBBL_NATIVE_SECRET                (HMAC secret)
 *   SUPABASE_URL                                  (for persistence)
 *   SUPABASE_SERVICE_ROLE_KEY                     (for persistence)
 *
 * @module functions/api/omnibridge/sync
 * @license Proprietary - APEX Business Systems Ltd.
 */

import {
  verifySyncPacket,
  isSyncPacketEnvelope,
  type SyncPacketEnvelope,
} from '../../../src/lib/omnibridge/syncPacketVerifier';
import {
  resolveSyncPacketSourceFromEnv,
  lastRegistryErrorFromEnv,
} from '../../../src/lib/omnibridge/registryEnv';
import {
  replayStore,
  getHardenedReplayKey,
} from '../../../src/lib/omnibridge/replayStore';
import { persistEvent, type EventStoreEnv } from '../../../src/lib/omnibridge/eventStore';
import { extractClientIp, isIpAllowed } from '../../../src/lib/omnibridge/verifySignedIngress';
import { jsonResponse, makeLogger, sanitize } from '../../../src/lib/omnibridge/httpUtils';

interface Env extends EventStoreEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  [key: string]: string | undefined;
}

type OnRequestPost = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;

const logEvent = makeLogger('omnibridge/sync');

function verifyErrorResponse(reason: string | undefined): Response {
  const status = reason === 'expired' ? 400 : 401;
  return jsonResponse(status, { error: reason ?? 'invalid_signature' });
}

export const onRequestPost: OnRequestPost = async ({ request, env }) => {
  const sourceId = request.headers.get('X-Omni-Source');
  if (!sourceId) {
    logEvent(true, 'missing_source_header', {});
    return jsonResponse(400, { error: 'missing_source_header' });
  }

  const resolution = resolveSyncPacketSourceFromEnv(sourceId, env);

  if (lastRegistryErrorFromEnv(env)) {
    logEvent(true, 'server_config_error', { source_id: sourceId });
    return jsonResponse(500, { error: 'server_config_error' });
  }

  if (!resolution) {
    logEvent(true, 'unknown_source', { source_id: sourceId });
    return jsonResponse(401, { error: 'unknown_source' });
  }

  const clientIp = extractClientIp(request);
  if (!isIpAllowed(clientIp, resolution.webhook.allowed_ips)) {
    logEvent(true, 'ip_not_allowed', { source_id: sourceId, client_ip: clientIp });
    return jsonResponse(403, { error: 'ip_not_allowed' });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse(400, { error: 'body_read_failed' });
  }
  if (rawBody.length > 256 * 1024) {
    logEvent(true, 'body_too_large', { source_id: sourceId, bytes: rawBody.length });
    return jsonResponse(413, { error: 'body_too_large' });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    logEvent(true, 'invalid_json', { source_id: sourceId });
    return jsonResponse(400, { error: 'invalid_json' });
  }

  if (!isSyncPacketEnvelope(parsed)) {
    logEvent(true, 'invalid_envelope', { source_id: sourceId });
    return jsonResponse(400, { error: 'invalid_envelope' });
  }
  const envelope = parsed as SyncPacketEnvelope;

  const replayKey = getHardenedReplayKey(sourceId, envelope.packet.packet_id);
  if (await replayStore.isDuplicate(replayKey)) {
    logEvent(true, 'replay_detected', { source_id: sourceId, packet_id: envelope.packet.packet_id });
    return jsonResponse(409, { error: 'replay_detected' });
  }

  const verify = await verifySyncPacket(envelope, resolution.secret);
  if (!verify.valid) {
    logEvent(true, `verify_failed:${verify.reason ?? 'unknown'}`, {
      source_id: sourceId,
      packet_id: envelope.packet.packet_id,
    });
    return verifyErrorResponse(verify.reason);
  }

  const cleanPayload = sanitize(envelope.packet.payload);

  const persist = await persistEvent({
    event_id: envelope.packet.packet_id,
    source_id: sourceId,
    tenant_id: resolution.client.tenant_id,
    profile: 'sync_packet',
    event_type: envelope.packet.event_type,
    trace_id: envelope.packet.trace_id,
    idempotency_key: envelope.packet.packet_id,
    payload: {
      entity_type: envelope.packet.entity_type,
      entity_id: envelope.packet.entity_id,
      league_id: envelope.packet.league_id,
      emitted_at: envelope.packet.emitted_at,
      data: cleanPayload,
    },
    raw_headers: {
      'x-omni-source': sourceId,
      'x-forwarded-for': request.headers.get('X-Forwarded-For') ?? '',
    },
    signature_verified: true,
  }, env);

  if (!persist.ok) {
    logEvent(true, `persist_failed:${persist.reason}`, {
      source_id: sourceId,
      packet_id: envelope.packet.packet_id,
      detail: persist.detail,
    });
    return jsonResponse(persist.reason === 'config_missing' ? 500 : 502, {
      error: 'persist_failed',
      reason: persist.reason,
    });
  }

  logEvent(false, persist.duplicate ? 'idempotent_accept' : 'event_persisted', {
    source_id: sourceId,
    packet_id: envelope.packet.packet_id,
    tenant_id: resolution.client.tenant_id,
    event_uuid: persist.event_uuid,
  });

  return jsonResponse(202, {
    received: true,
    event_uuid: persist.event_uuid,
    packet_id: envelope.packet.packet_id,
    duplicate: persist.duplicate,
  });
};

// Explicit method rejection for non-POST calls.
type OnRequest = (context: { request: Request; env: Env }) => Response | Promise<Response>;
export const onRequest: OnRequest = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }
  return onRequestPost({ request, env });
};
