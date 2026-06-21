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

// ── Minimal CBOR decoder (attestationObject + COSE_Key only) ────────────────
// Supports the subset CTAP/WebAuthn emits: unsigned/negative ints, byte
// strings, text strings, arrays, maps, tags, and the false/true/null simples.

interface CborCursor {
  readonly bytes: Uint8Array;
  pos: number;
}

function cborReadUint(cur: CborCursor, n: number): number {
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = v * 256 + cur.bytes[cur.pos++];
  }
  return v;
}

function cborDecodeItem(cur: CborCursor): unknown {
  const ib = cur.bytes[cur.pos++];
  const major = ib >> 5;
  const ai = ib & 0x1f;

  const readLen = (): number => {
    if (ai < 24) return ai;
    if (ai === 24) return cur.bytes[cur.pos++];
    if (ai === 25) return cborReadUint(cur, 2);
    if (ai === 26) return cborReadUint(cur, 4);
    if (ai === 27) return cborReadUint(cur, 8);
    throw new Error('cbor_bad_length');
  };

  switch (major) {
    case 0:
      return readLen();
    case 1:
      return -1 - readLen();
    case 2: {
      const l = readLen();
      const v = cur.bytes.slice(cur.pos, cur.pos + l);
      cur.pos += l;
      return v;
    }
    case 3: {
      const l = readLen();
      const v = new TextDecoder().decode(cur.bytes.subarray(cur.pos, cur.pos + l));
      cur.pos += l;
      return v;
    }
    case 4: {
      const l = readLen();
      const arr: unknown[] = [];
      for (let i = 0; i < l; i++) arr.push(cborDecodeItem(cur));
      return arr;
    }
    case 5: {
      const l = readLen();
      const m = new Map<unknown, unknown>();
      for (let i = 0; i < l; i++) {
        const k = cborDecodeItem(cur);
        m.set(k, cborDecodeItem(cur));
      }
      return m;
    }
    case 6: {
      readLen(); // tag value — ignore, decode the tagged item
      return cborDecodeItem(cur);
    }
    case 7: {
      if (ai === 20) return false;
      if (ai === 21) return true;
      if (ai === 22) return null;
      if (ai === 23) return undefined;
      throw new Error('cbor_unsupported_simple');
    }
    default:
      throw new Error('cbor_unsupported_major');
  }
}

// ── attestationObject / authenticatorData parsing ───────────────────────────

/** Extract the authenticatorData byte string from a base64url attestationObject. */
export function parseAttestationObject(attestationObjectB64: string): Uint8Array {
  const cur: CborCursor = { bytes: base64UrlDecode(attestationObjectB64), pos: 0 };
  const map = cborDecodeItem(cur) as Map<unknown, unknown>;
  const authData = map.get('authData');
  if (!(authData instanceof Uint8Array)) {
    throw new Error('attestation_missing_auth_data');
  }
  return authData;
}

export interface ParsedAuthData {
  signCount: number;
  credentialId?: Uint8Array;
  coseKey?: Map<number, unknown>;
}

/**
 * Parse authenticatorData. When the AT (attested-credential-data) flag is set,
 * also extracts the credential id and the COSE public key.
 * Layout: rpIdHash(32) | flags(1) | signCount(4) | [aaguid(16) credIdLen(2)
 *         credId(credIdLen) credentialPublicKey(COSE)]
 */
export function parseAuthData(authData: Uint8Array): ParsedAuthData {
  if (authData.byteLength < 37) {
    throw new Error('authenticator_data_too_short');
  }
  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  const flags = authData[32];
  const signCount = view.getUint32(33, false);
  const hasAttestedData = (flags & 0x40) !== 0;
  if (!hasAttestedData) {
    return { signCount };
  }
  let off = 37 + 16; // skip rpIdHash+flags+count, then aaguid(16)
  const credIdLen = view.getUint16(off, false);
  off += 2;
  const credentialId = authData.slice(off, off + credIdLen);
  off += credIdLen;
  const cur: CborCursor = { bytes: authData, pos: off };
  const coseKey = cborDecodeItem(cur) as Map<number, unknown>;
  return { signCount, credentialId, coseKey };
}

/**
 * Convert a COSE_Key map to a raw uncompressed P-256 public point (0x04||x||y).
 * Only ES256 (EC2 / P-256 / alg -7) is accepted; anything else is rejected
 * honestly rather than silently mis-verified.
 */
export function coseKeyToRawP256(coseKey: Map<number, unknown>): Uint8Array {
  const kty = coseKey.get(1);
  const alg = coseKey.get(3);
  const crv = coseKey.get(-1);
  if (kty !== 2) throw new Error('unsupported_key_type'); // 2 = EC2
  if (alg !== -7) throw new Error('unsupported_algorithm'); // -7 = ES256
  if (crv !== 1) throw new Error('unsupported_curve'); // 1 = P-256
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  if (!(x instanceof Uint8Array) || x.length !== 32 || !(y instanceof Uint8Array) || y.length !== 32) {
    throw new Error('invalid_ec_point');
  }
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);
  return raw;
}

export interface ExtractedCredential {
  /** base64url of the raw uncompressed P-256 point (0x04||x||y). */
  publicKeyRawB64: string;
  signCount: number;
  /** base64url credential id from authenticatorData (may differ in encoding). */
  credentialIdB64: string;
}

/**
 * Registration helper: parse the attestationObject and extract the ES256
 * public key as a raw point ready for `crypto.subtle.importKey('raw', …)`.
 */
export function extractCredentialPublicKey(attestationObjectB64: string): ExtractedCredential {
  const authData = parseAttestationObject(attestationObjectB64);
  const parsed = parseAuthData(authData);
  if (!parsed.coseKey) {
    throw new Error('no_credential_public_key');
  }
  const raw = coseKeyToRawP256(parsed.coseKey);
  return {
    publicKeyRawB64: base64UrlEncode(raw),
    signCount: parsed.signCount,
    credentialIdB64: parsed.credentialId ? base64UrlEncode(parsed.credentialId) : '',
  };
}

// ── ECDSA assertion signature verification ──────────────────────────────────

/**
 * Convert an ASN.1 DER ECDSA signature (SEQUENCE{INTEGER r, INTEGER s}) into
 * the raw 64-byte r||s form Web Crypto's ECDSA verify expects. Authenticators
 * emit DER for ES256; some test/raw paths emit raw already.
 */
export function derToRawEcdsaSignature(der: Uint8Array): Uint8Array {
  let pos = 0;
  if (der[pos++] !== 0x30) throw new Error('der_bad_sequence');
  // sequence length (may be long-form, but ES256 sigs are short)
  let seqLen = der[pos++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = cborReadUint({ bytes: der, pos }, n);
    pos += n;
  }
  const readInt = (): Uint8Array => {
    if (der[pos++] !== 0x02) throw new Error('der_bad_integer');
    const len = der[pos++];
    let v = der.slice(pos, pos + len);
    pos += len;
    while (v.length > 1 && v[0] === 0x00) v = v.slice(1); // strip sign padding
    if (v.length > 32) v = v.slice(v.length - 32);
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length); // left-pad to 32 bytes
    return out;
  };
  const r = readInt();
  const s = readInt();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

export interface AssertionSignatureInput {
  /** base64url raw uncompressed P-256 point stored at registration. */
  publicKeyRawB64: string;
  authenticatorDataB64: string;
  clientDataJSONB64: string;
  /** base64url assertion signature (DER or raw 64-byte r||s). */
  signatureB64: string;
}

/**
 * Cryptographically verify a WebAuthn assertion: ECDSA-P256/SHA-256 over
 * `authenticatorData || SHA-256(clientDataJSON)` using the stored public key.
 * Returns true only if the authenticator's private key produced the signature.
 */
export async function verifyAssertionSignature(input: AssertionSignatureInput): Promise<boolean> {
  const pubRaw = base64UrlDecode(input.publicKeyRawB64);
  if (pubRaw.length !== 65 || pubRaw[0] !== 0x04) {
    return false; // not a raw uncompressed P-256 point
  }
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'raw',
      pubRaw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  } catch {
    return false;
  }

  const authData = base64UrlDecode(input.authenticatorDataB64);
  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', base64UrlDecode(input.clientDataJSONB64)),
  );
  const signedData = new Uint8Array(authData.length + clientDataHash.length);
  signedData.set(authData, 0);
  signedData.set(clientDataHash, authData.length);

  const sig = base64UrlDecode(input.signatureB64);
  let rawSig: Uint8Array;
  try {
    rawSig = sig.length === 64 ? sig : derToRawEcdsaSignature(sig);
  } catch {
    return false;
  }

  try {
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSig, signedData);
  } catch {
    return false;
  }
}
