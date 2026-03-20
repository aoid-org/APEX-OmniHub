/**
 * api/omnibridge/token.ts — OAuth 2.0 M2M Token Endpoint
 *
 * Issues short-lived JWTs via the client_credentials grant for
 * machine-to-machine integrations within the OmniBridge ecosystem.
 *
 * Security:
 * - Constant-time secret comparison (timing-safe)
 * - In-memory IP-based rate limiting (10 req/min)
 * - 15-minute token expiry
 *
 * @module api/omnibridge/token
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { generateM2MToken, type M2MClaims } from '../../src/lib/auth/m2mAuth';
import { timingSafeEqual } from '../../src/lib/security/hmacValidator';

export const config = { runtime: 'edge' };

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface M2MClientRecord {
  client_id: string;
  client_secret_hash: string;
  scopes: string[];
  tenant_id: string;
}

/* -------------------------------------------------------------------------- */
/*  In-memory rate limiter (per-isolate; resets on cold start)                */
/* -------------------------------------------------------------------------- */

interface RateBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, RateBucket>();

/**
 * Check and increment the rate limit for a given IP.
 * Returns true if the request is allowed, false if rate-limited.
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * Periodically prune expired buckets to prevent unbounded memory growth.
 * Runs at most once per minute.
 */
let lastPrune = 0;
function pruneRateBuckets(): void {
  const now = Date.now();
  if (now - lastPrune < RATE_LIMIT_WINDOW_MS) return;
  lastPrune = now;

  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) {
      rateBuckets.delete(ip);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

function extractClientIp(request: Request): string {
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) {
    // Take the first (leftmost) IP — the original client IP
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/**
 * Hash a plaintext secret with SHA-256 (hex) for comparison against
 * the stored client_secret_hash. In production the client sends the
 * raw secret and we hash it before comparing to the stored hash.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

interface CredentialFields {
  grantType: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

/**
 * Parse client credentials from the request body.
 * Supports both form-urlencoded and JSON content types.
 */
async function parseCredentials(request: Request): Promise<CredentialFields> {
  const contentType = request.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return {
      grantType: formData.get('grant_type') as string | null,
      clientId: formData.get('client_id') as string | null,
      clientSecret: formData.get('client_secret') as string | null,
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return {
    grantType: typeof body.grant_type === 'string' ? body.grant_type : null,
    clientId: typeof body.client_id === 'string' ? body.client_id : null,
    clientSecret: typeof body.client_secret === 'string' ? body.client_secret : null,
  };
}

/**
 * Load and parse M2M client records from environment.
 */
function loadM2MClients(): M2MClientRecord[] | null {
  const clientsJson = process.env['OMNIBRIDGE_M2M_CLIENTS'];
  if (!clientsJson) {
    console.error('[omnibridge/token] OMNIBRIDGE_M2M_CLIENTS env var not configured');
    return null;
  }

  try {
    const clients = JSON.parse(clientsJson) as M2MClientRecord[];
    if (!Array.isArray(clients)) return null;
    return clients;
  } catch {
    console.error('[omnibridge/token] OMNIBRIDGE_M2M_CLIENTS is not valid JSON array');
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  pruneRateBuckets();
  const clientIp = extractClientIp(request);
  if (!checkRateLimit(clientIp)) {
    return jsonResponse(429, { error: 'rate_limit_exceeded' });
  }

  let credentials: CredentialFields;
  try {
    credentials = await parseCredentials(request);
  } catch {
    return jsonResponse(400, { error: 'invalid_request', error_description: 'Malformed request body' });
  }

  const { grantType, clientId, clientSecret } = credentials;

  if (grantType !== 'client_credentials') {
    return jsonResponse(400, {
      error: 'unsupported_grant_type',
      error_description: 'Only client_credentials grant is supported',
    });
  }

  if (!clientId || !clientSecret) {
    return jsonResponse(400, {
      error: 'invalid_request',
      error_description: 'client_id and client_secret are required',
    });
  }

  const clients = loadM2MClients();
  if (!clients) {
    return jsonResponse(500, { error: 'server_error', error_description: 'Token service misconfigured' });
  }

  const matchedClient = clients.find((c) => c.client_id === clientId);
  if (!matchedClient) {
    return jsonResponse(401, { error: 'invalid_client', error_description: 'Unknown client' });
  }

  const providedHash = await sha256Hex(clientSecret);
  if (!timingSafeEqual(providedHash, matchedClient.client_secret_hash)) {
    return jsonResponse(401, { error: 'invalid_client', error_description: 'Invalid credentials' });
  }

  const jwtSecret = process.env['OMNIBRIDGE_JWT_SECRET'];
  if (!jwtSecret) {
    console.error('[omnibridge/token] OMNIBRIDGE_JWT_SECRET env var not configured');
    return jsonResponse(500, { error: 'server_error', error_description: 'Token service misconfigured' });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 900;

  const claims: M2MClaims = {
    sub: matchedClient.client_id,
    tenant_id: matchedClient.tenant_id,
    scopes: matchedClient.scopes,
    iat: now,
    exp: now + expiresIn,
  };

  const accessToken = await generateM2MToken(claims, jwtSecret);

  return jsonResponse(200, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
  });
}
