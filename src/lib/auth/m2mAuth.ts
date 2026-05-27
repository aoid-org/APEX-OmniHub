/**
 * Machine-to-Machine (M2M) JWT Generation & Validation
 *
 * Edge-compatible JWT implementation using Web Crypto API (no external deps).
 * Generates and verifies short-lived HS256 JWTs for service-to-service auth.
 *
 * APEX STANDARDS:
 * - Zero-trust: Every claim is validated on verification
 * - Fail-closed: Any validation failure results in rejection
 * - Edge-native: Uses only Web Crypto API, no Node.js crypto
 *
 * @module lib/auth/m2mAuth
 * @license Proprietary - APEX Business Systems Ltd.
 */

/**
 * Claims embedded in M2M JWTs.
 */
export interface M2MClaims {
  /** Client identifier (subject) */
  sub: string;
  /** Tenant identifier for data isolation */
  tenant_id: string;
  /** Granted scopes / permissions */
  scopes: string[];
  /** Issued-at timestamp (unix seconds) */
  iat: number;
  /** Expiration timestamp (unix seconds) */
  exp: number;
}

const encoder = new TextEncoder();

/** JWT header for HS256 — always the same, so we pre-encode it. */
const JWT_HEADER = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

/**
 * Base64url-encode a string (no padding).
 */
function base64urlEncode(input: string): string {
  // TextEncoder produces UTF-8 bytes; btoa expects latin1 chars
  const bytes = encoder.encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/={1,2}$/, '');
}

/**
 * Base64url-encode a Uint8Array (no padding).
 */
function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/={1,2}$/, '');
}

/**
 * Base64url-decode to a string.
 */
function base64urlDecode(input: string): string {
  let base64 = input.replaceAll('-', '+').replaceAll('_', '/');
  // Restore padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i)!;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Base64url-decode to a Uint8Array.
 */
function base64urlDecodeBytes(input: string): Uint8Array {
  let base64 = input.replaceAll('-', '+').replaceAll('_', '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i)!;
  }
  return bytes;
}

/**
 * Import a string secret as a CryptoKey for HMAC-SHA256.
 */
async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Generate a signed M2M JWT with the given claims.
 *
 * @param claims - The M2MClaims to encode into the token
 * @param secret - The HMAC-SHA256 signing secret
 * @returns A signed JWT string (header.payload.signature)
 */
export async function generateM2MToken(claims: M2MClaims, secret: string): Promise<string> {
  if (!claims.sub || !claims.tenant_id || !Array.isArray(claims.scopes)) {
    throw new TypeError('M2M token generation requires sub, tenant_id, and scopes');
  }
  if (!claims.iat || !claims.exp) {
    throw new TypeError('M2M token generation requires iat and exp');
  }
  if (claims.exp <= claims.iat) {
    throw new TypeError('Token expiration must be after issued-at time');
  }

  const payloadB64 = base64urlEncode(JSON.stringify(claims));
  const signingInput = `${JWT_HEADER}.${payloadB64}`;

  const key = await importSigningKey(secret);
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput)),
  );

  return `${signingInput}.${base64urlEncodeBytes(signatureBytes)}`;
}

/**
 * Verify and decode an M2M JWT.
 *
 * Validates:
 * - JWT structure (3 parts)
 * - HS256 algorithm header
 * - HMAC-SHA256 signature (constant-time via Web Crypto)
 * - Token expiration
 * - Required claims presence
 *
 * @param token  - The JWT string to verify
 * @param secret - The HMAC-SHA256 signing secret
 * @returns The decoded M2MClaims if valid
 * @throws Error if verification fails for any reason
 */
export async function verifyM2MToken(token: string, secret: string): Promise<M2MClaims> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT structure: expected 3 parts');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Validate header
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(base64urlDecode(headerB64));
  } catch {
    throw new Error('Invalid JWT header encoding');
  }

  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported algorithm: ${String(header.alg)}`);
  }

  // Verify signature using crypto.subtle.verify (constant-time)
  const key = await importSigningKey(secret);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureBytes = base64urlDecodeBytes(signatureB64);

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signatureBytes as any,
    encoder.encode(signingInput),
  );

  if (!valid) {
    throw new Error('Invalid token signature');
  }

  // Decode payload
  let claims: M2MClaims;
  try {
    claims = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    throw new Error('Invalid JWT payload encoding');
  }

  // Validate required claims
  if (!claims.sub || typeof claims.sub !== 'string') {
    throw new Error('Missing or invalid "sub" claim');
  }
  if (!claims.tenant_id || typeof claims.tenant_id !== 'string') {
    throw new Error('Missing or invalid "tenant_id" claim');
  }
  if (!Array.isArray(claims.scopes)) {
    throw new TypeError('Missing or invalid "scopes" claim');
  }
  if (typeof claims.iat !== 'number') {
    throw new TypeError('Missing or invalid "iat" claim');
  }
  if (typeof claims.exp !== 'number') {
    throw new TypeError('Missing or invalid "exp" claim');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    throw new Error('Token has expired');
  }

  // Sanity check: iat should not be in the future (with 60s clock skew tolerance)
  if (claims.iat > now + 60) {
    throw new Error('Token issued-at time is in the future');
  }

  return claims;
}
