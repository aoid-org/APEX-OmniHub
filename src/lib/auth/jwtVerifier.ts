/**
 * JWT Verification Utility — Supabase JWT Validator (Edge-Compatible)
 *
 * Verifies Supabase-issued JWTs using HS256 with the SUPABASE_JWT_SECRET.
 * Uses the Web Crypto API for edge-compatible cryptographic verification
 * (no node:crypto dependency).
 *
 * APEX STANDARDS:
 * - Zero-trust: Every edge call must present a valid, cryptographically verified JWT
 * - Fail-closed: Missing or invalid tokens result in immediate rejection
 * - Deterministic: Same token + secret always produces same validation result
 * - Edge-first: Web Crypto API only — runs in Cloudflare Workers, Deno Deploy, Vercel Edge
 *
 * @module lib/auth/jwtVerifier
 * @license Proprietary - APEX Business Systems Ltd.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Decoded JWT payload claims from a Supabase-issued token. */
export interface SupabaseJWTPayload {
  /** Supabase user ID (UUID) */
  sub: string;
  /** User email address */
  email?: string;
  /** User role (e.g. 'authenticated', 'service_role') */
  role?: string;
  /** Token expiration (unix timestamp in seconds) */
  exp: number;
  /** Token issued-at (unix timestamp in seconds) */
  iat: number;
  /** Token audience (typically 'authenticated') */
  aud?: string;
  /** Issuer URL */
  iss?: string;
  /** App metadata from Supabase auth */
  app_metadata?: Record<string, unknown>;
  /** User metadata from Supabase auth */
  user_metadata?: Record<string, unknown>;
}

/** Result of a JWT verification attempt. */
export interface VerificationResult {
  /** Whether the token passed all checks (signature, expiration, structure). */
  valid: boolean;
  /** Decoded payload if verification succeeded; null otherwise. */
  payload: SupabaseJWTPayload | null;
  /** Human-readable error message if verification failed; null otherwise. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/** Base64url-decode a string to a Uint8Array (edge-compatible, no Buffer). */
function base64UrlDecode(input: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to multiple of 4
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a Uint8Array to base64url string. */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Parse the payload segment of a JWT into a typed object. */
function decodeJWTPayload(payloadB64: string): SupabaseJWTPayload {
  const bytes = base64UrlDecode(payloadB64);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as SupabaseJWTPayload;
}

/** Import raw secret bytes as an HMAC-SHA256 CryptoKey. */
async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/**
 * Compute the HMAC-SHA256 signature for a JWT's signing input
 * (header.payload) and compare it against the token's signature.
 * Returns true only if the signatures match.
 */
async function verifyHS256Signature(
  signingInput: string,
  signatureB64: string,
  secret: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const data = encoder.encode(signingInput);

  const signatureBytes = await crypto.subtle.sign('HMAC', key, data);
  const computedSignature = base64UrlEncode(new Uint8Array(signatureBytes));

  // Constant-time comparison to prevent timing attacks
  if (computedSignature.length !== signatureB64.length) return false;

  let mismatch = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    mismatch |= computedSignature.charCodeAt(i) ^ signatureB64.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify a Supabase JWT token with full HS256 cryptographic validation.
 *
 * Checks performed (in order):
 * 1. Structural validation (3 dot-separated parts)
 * 2. Header algorithm check (must be HS256)
 * 3. HMAC-SHA256 signature verification using SUPABASE_JWT_SECRET
 * 4. Expiration check (exp claim vs current time)
 * 5. Required claims validation (sub must be present)
 *
 * @param token - The raw JWT string (without "Bearer " prefix)
 * @returns VerificationResult with decoded payload on success
 */
export async function verifySupabaseJWT(token: string): Promise<VerificationResult> {
  try {
    // --- Guard: token must be a non-empty string ---
    if (!token || typeof token !== 'string') {
      return { valid: false, payload: null, error: 'Token is required' };
    }

    // --- Structural validation ---
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, payload: null, error: 'Invalid JWT structure: expected 3 segments' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // --- Header validation ---
    const headerBytes = base64UrlDecode(headerB64);
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as {
      alg?: string;
      typ?: string;
    };

    if (header.alg !== 'HS256') {
      return {
        valid: false,
        payload: null,
        error: `Unsupported algorithm: ${header.alg ?? 'none'}. Only HS256 is accepted.`,
      };
    }

    // --- Signature verification ---
    const secret = typeof globalThis.process !== 'undefined'
      ? (globalThis.process as NodeJS.Process).env?.SUPABASE_JWT_SECRET
      : undefined;

    if (!secret) {
      return {
        valid: false,
        payload: null,
        error: 'SUPABASE_JWT_SECRET is not configured',
      };
    }

    const signingInput = `${headerB64}.${payloadB64}`;
    const signatureValid = await verifyHS256Signature(signingInput, signatureB64, secret);

    if (!signatureValid) {
      return { valid: false, payload: null, error: 'Invalid signature' };
    }

    // --- Payload decoding and validation ---
    const payload = decodeJWTPayload(payloadB64);

    if (!payload.sub) {
      return { valid: false, payload: null, error: 'Missing required claim: sub' };
    }

    // --- Expiration check ---
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, payload: null, error: 'Token has expired' };
    }

    return { valid: true, payload, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JWT verification failed';
    return { valid: false, payload: null, error: message };
  }
}

/**
 * Extract a Bearer token from a Request object's Authorization header.
 *
 * @param request - The incoming Request object (Web API / edge-compatible)
 * @returns The raw token string, or null if the header is missing/malformed
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

/**
 * Combined extraction + verification in one call.
 * Extracts the Bearer token from a Request and verifies it.
 *
 * Fail-closed: returns invalid result if any step fails.
 *
 * @param request - The incoming Request object
 * @returns VerificationResult with decoded payload on success
 */
export async function verifyRequestJWT(request: Request): Promise<VerificationResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      valid: false,
      payload: null,
      error: 'Missing or malformed Authorization header',
    };
  }
  return verifySupabaseJWT(token);
}
