/**
 * api/omnibridge/sync.ts — SBBL-HQ Native Sync Packet Ingress
 *
 * Accepts the envelope produced by sbbl-hq/src/lib/sync-packets.ts:
 *   { packet: SyncPacket, signature: base64url(HMAC-SHA256(JSON(packet))) }
 *
 * Flow:
 *   1. Parse + validate envelope shape (fail-closed on malformed).
 *   2. Enforce emitted_at skew (±300s).
 *   3. Replay-guard on packet_id.
 *   4. Resolve source + secret via registry (profile='sync_packet').
 *   5. Verify HMAC-SHA256(JSON(packet), secret) with constant-time subtle.verify.
 *   6. IP allowlist (if configured).
 *   7. Sanitize payload.
 *   8. Persist to omnibridge_events (durable, idempotent).
 *   9. Return 202 on success (grant-evidentiary durability achieved at this point).
 *
 * @module api/omnibridge/sync
 * @license Proprietary - APEX Business Systems Ltd.
 */

import {
  resolveSyncPacketSource,
  getRegistryError,
} from '../../src/lib/omnibridge/sourceRegistry';
import {
  verifySyncPacket,
  isSyncPacketEnvelope,
  type SyncPacketEnvelope,
} from '../../src/lib/omnibridge/syncPacketVerifier';
import {
  replayStore,
  getHardenedReplayKey,
} from '../../src/lib/omnibridge/replayStore';
import { persistEvent } from '../../src/lib/omnibridge/eventStore';
import { extractClientIp, isIpAllowed } from '../../src/lib/omnibridge/verifySignedIngress';

export const config = { runtime: 'edge' };

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function logEvent(deny: boolean, reason: string, meta: Record<string, unknown>): void {
  const prefix = '[omnibridge/sync]';
  const line = `${prefix} ${deny ? 'DENY' : 'ACCEPT'}: ${reason} | ${JSON.stringify(meta)}`;
  if (deny) console.error(line); else console.warn(line);
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('__')) continue;
    if (typeof v === 'string' && /<script/i.test(v)) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return sanitize(item as Record<string, unknown>);
        }
        if (typeof item === 'string' && /<script/i.test(item)) return undefined;
        return item;
      }).filter((item) => item !== undefined);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  // Source identity carried in header so we can look up registry before parsing
  // the body (defence against oversize/malicious bodies).
  const sourceId = request.headers.get('X-Omni-Source');
  if (!sourceId) {
    logEvent(true, 'missing_source_header', {});
    return jsonResponse(400, { error: 'missing_source_header' });
  }

  const resolution = resolveSyncPacketSource(sourceId);

  if (getRegistryError()) {
    logEvent(true, 'server_config_error', { source_id: sourceId, error: getRegistryError()?.message });
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

  // Replay guard — packet_id is the canonical dedupe key for SBBL native.
  const replayKey = getHardenedReplayKey(sourceId, envelope.packet.packet_id);
  if (replayStore.isDuplicate(replayKey)) {
    logEvent(true, 'replay_detected', { source_id: sourceId, packet_id: envelope.packet.packet_id });
    return jsonResponse(409, { error: 'replay_detected' });
  }

  const verify = await verifySyncPacket(envelope, resolution.secret);
  if (!verify.valid) {
    logEvent(true, `verify_failed:${verify.reason ?? 'unknown'}`, {
      source_id: sourceId,
      packet_id: envelope.packet.packet_id,
    });
    const status = verify.reason === 'expired' ? 400 : 401;
    return jsonResponse(status, { error: verify.reason ?? 'invalid_signature' });
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
  });

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
}
