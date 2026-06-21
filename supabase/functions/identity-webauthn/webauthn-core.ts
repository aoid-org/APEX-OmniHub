/**
 * WebAuthn core verification logic — runtime-agnostic.
 *
 * This module uses ONLY standard Web APIs (Web Crypto, TextEncoder, atob/btoa)
 * so it imports cleanly in BOTH the Deno edge runtime (index.ts) and the
 * Node/jsdom vitest runtime (tests/release/identity-webauthn-surface.spec.ts).
 * It has ZERO external imports on purpose — do not add `https://` or `@/` imports.
 *
 * Security properties enforced here:
 *  - Challenges are 32 bytes of CSPRNG output (unguessable, single-use).
 *  - Replay protection via stored challenge match + WebAuthn sign-counter
 *    monotonicity (a clone or replayed assertion presents an equal/older
 *    counter and is rejected).
 *  - Only PUBLIC credential metadata is parsed/stored. No private key material
 *    or biometric data is ever handled — those never leave the authenticator.
 */

export const CHALLENGE_BYTES = 32;

/** Stored, non-secret WebAuthn credential metadata (public key only). */
export interface StoredCredential {
  /** base64url credential id returned by the authenticator. */
  credentialId: string;
  /** base64url of the COSE/attestationObject-derived public key metadata. */
  publicKey: string;
  /** Highest signature counter observed so far (replay watermark). */
  signCount: number;
  /** ISO timestamp of registration. */
  createdAt: string;
  /** ISO timestamp of last successful assertion. */
  lastUsedAt?: string;
}

/** Result of an assertion verification attempt. */
export interface AssertionVerification {
  verified: boolean;
  reason: string;
  /** New sign counter to persist when verified. */
  newSignCount?: number;
}

// ── base64url helpers (standard atob/btoa, present in Deno + Node) ──────────

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Challenge generation ────────────────────────────────────────────────────

/**
 * Generate a fresh, unguessable, single-use challenge (base64url string).
 * Uses Web Crypto CSPRNG; never falls back to Math.random.
 */
export function generateChallenge(): string {
  const buf = new Uint8Array(CHALLENGE_BYTES);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

// ── clientDataJSON parsing ──────────────────────────────────────────────────

export interface ClientData {
  type: string;
  challenge: string;
  origin: string;
}

/**
 * Parse the base64url clientDataJSON produced by the browser and confirm the
 * embedded challenge matches the server-issued challenge. The challenge inside
 * clientDataJSON is itself base64url of the raw challenge bytes.
 */
export function parseAndVerifyClientData(
  clientDataJSONb64: string,
  expectedChallenge: string,
  expectedType: 'webauthn.create' | 'webauthn.get',
): { ok: boolean; reason: string; clientData?: ClientData } {
  let clientData: ClientData;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(clientDataJSONb64));
    clientData = JSON.parse(json) as ClientData;
  } catch {
    return { ok: false, reason: 'clientdata_parse_error' };
  }

  if (clientData.type !== expectedType) {
    return { ok: false, reason: 'clientdata_type_mismatch' };
  }

  // clientData.challenge is base64url of the raw challenge bytes. Normalise both
  // sides to raw bytes before comparing to avoid padding/encoding false-negatives.
  if (!constantTimeEqual(base64UrlDecode(clientData.challenge), base64UrlDecode(expectedChallenge))) {
    return { ok: false, reason: 'challenge_mismatch' };
  }

  return { ok: true, reason: 'clientdata_ok', clientData };
}

// ── authenticatorData parsing (extracts sign counter) ───────────────────────

/**
 * Extract the 32-bit big-endian signature counter from authenticatorData.
 * Layout: rpIdHash(32) | flags(1) | signCount(4) | ...
 */
export function extractSignCount(authenticatorDataB64: string): number {
  const data = base64UrlDecode(authenticatorDataB64);
  if (data.byteLength < 37) {
    throw new Error('authenticator_data_too_short');
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getUint32(33, false); // big-endian, offset 33 (after 32-byte hash + 1 flag byte)
}

// ── Replay / sign-counter verification ──────────────────────────────────────

/**
 * Verify an assertion against the stored credential.
 *
 * Replay protection: the presented sign counter must be strictly greater than
 * the stored watermark, UNLESS both are 0 (some platform authenticators always
 * report 0 — in that case the per-challenge single-use guarantee carries the
 * replay protection on its own). A counter that is equal-or-lower than a
 * previously-seen non-zero counter indicates a replay or a cloned credential
 * and is rejected.
 */
export function verifyAssertionCounter(
  stored: StoredCredential,
  presentedSignCount: number,
): AssertionVerification {
  if (!Number.isInteger(presentedSignCount) || presentedSignCount < 0) {
    return { verified: false, reason: 'invalid_sign_count' };
  }

  const both_zero = stored.signCount === 0 && presentedSignCount === 0;

  if (!both_zero && presentedSignCount <= stored.signCount) {
    return {
      verified: false,
      reason: 'replay_detected_stale_sign_count',
    };
  }

  return {
    verified: true,
    reason: 'assertion_ok',
    newSignCount: presentedSignCount,
  };
}

// ── constant-time comparison (avoid timing oracles on challenge match) ──────

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
