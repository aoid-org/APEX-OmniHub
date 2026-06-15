/**
 * SBBL-HQ Native Sync Packet Verifier
 *
 * Accepts SBBL-HQ's native outbound format produced by
 * sbbl-hq/src/lib/sync-packets.ts::signSyncPacket:
 *
 *   Body:  { packet: SyncPacket, signature: base64url(HMAC-SHA256(secret, JSON.stringify(packet))) }
 *
 * Edge-compatible (Web Crypto API only). Constant-time verification via
 * crypto.subtle.verify.
 *
 * @module lib/omnibridge/syncPacketVerifier
 * @license Proprietary - APEX Business Systems Ltd.
 */

const encoder = new TextEncoder();

export interface SyncPacket {
  packet_id: string;
  trace_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  league_id: string | null;
  payload: Record<string, unknown>;
  emitted_at: string;
}

export interface SyncPacketEnvelope {
  packet: SyncPacket;
  signature: string;
}

export interface VerifyOptions {
  maxSkewSeconds?: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: 'malformed' | 'bad_signature' | 'expired' | 'invalid_timestamp';
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> | null {
  // NOSONAR javascript:S5547 — atob() is the correct Web Crypto-compatible
  // primitive for base64url decoding in Cloudflare Pages Functions runtime.
  // Node's Buffer API is not available; atob/btoa are the canonical choice.
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padLen = (4 - (value.length % 4)) % 4;
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat(padLen);
  try {
    const binary = atob(normalized); // NOSONAR — see justification above
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.codePointAt(i) ?? 0;
    return out;
  } catch {
    return null;
  }
}

const SYNC_PACKET_STRING_FIELDS = ['packet_id', 'trace_id', 'event_type', 'entity_type', 'emitted_at'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasRequiredPacketStrings(packet: Record<string, unknown>): boolean {
  return SYNC_PACKET_STRING_FIELDS.every((field) => typeof packet[field] === 'string' && packet[field].length > 0);
}

export function isSyncPacketEnvelope(value: unknown): value is SyncPacketEnvelope {
  if (!isRecord(value) || typeof value.signature !== 'string' || value.signature.length === 0) return false;
  if (!isRecord(value.packet) || !hasRequiredPacketStrings(value.packet)) return false;
  if (!isRecord(value.packet.payload)) return false;
  return (value.packet.entity_id === null || typeof value.packet.entity_id === 'string')
    && (value.packet.league_id === null || typeof value.packet.league_id === 'string');
}

/**
 * Validate that emitted_at is an ISO string and within maxSkewSeconds of now.
 */
export function isEmittedAtValid(emittedAt: string, maxSkewSeconds: number): boolean {
  const ms = Date.parse(emittedAt);
  if (Number.isNaN(ms)) return false;
  const nowMs = Date.now();
  return Math.abs(nowMs - ms) <= maxSkewSeconds * 1000;
}

/**
 * Verify the SBBL-HQ native sync packet envelope.
 *
 * Fails closed on any shape, signature, or timestamp violation.
 */
export async function verifySyncPacket(
  envelope: SyncPacketEnvelope,
  secret: string,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const maxSkewSeconds = options.maxSkewSeconds ?? 300;

  if (!isSyncPacketEnvelope(envelope)) {
    return { valid: false, reason: 'malformed' };
  }

  if (!isEmittedAtValid(envelope.packet.emitted_at, maxSkewSeconds)) {
    return { valid: false, reason: 'expired' };
  }

  const sigBytes = base64UrlToBytes(envelope.signature);
  if (!sigBytes) {
    return { valid: false, reason: 'bad_signature' };
  }

  const canonicalBody = JSON.stringify(envelope.packet);

  try {
    // NOSONAR javascript:S2245 — HMAC key material comes from a trusted env
    // var resolved via the signed source registry, NOT from user input.
    // Constant-time verify via crypto.subtle.verify is the intended pattern.
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(canonicalBody));
    return ok ? { valid: true } : { valid: false, reason: 'bad_signature' };
  } catch {
    return { valid: false, reason: 'bad_signature' };
  }
}

/**
 * Test/diagnostic helper — sign a packet with the same algorithm SBBL-HQ uses.
 * NOT called in production code paths. Exposed for unit tests and round-trip
 * verification fixtures.
 */
export async function signSyncPacketForTest(
  packet: SyncPacket,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(JSON.stringify(packet)),
  );
  const bytes = new Uint8Array(signature);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCodePoint(b);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
