/**
 * api/cors.ts — Vercel Edge CORS Proxy (Hardened)
 *
 * Security controls:
 *  1. Allowlist-only:  CORS_PROXY_ALLOWLIST env var (comma-separated hostnames).
 *     Requests whose source hostname is not on the allowlist are rejected 403.
 *     If the env var is unset or empty the proxy denies all requests (fail-closed).
 *  2. HTTPS-only:      Only https:// source URLs are accepted.
 *  3. Private-IP block: IP-literal hostnames that resolve to RFC-1918, loopback,
 *     link-local, or cloud-metadata ranges are rejected immediately.
 *  4. Redirect safety: Redirects are followed manually (redirect:'manual') and
 *     each Location header is validated through the same rules before following.
 *
 * Range-request passthrough · WinterCG-safe header reconstruction
 * APEX-OmniHub v1.3.5
 */

export const config = { runtime: 'edge' };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Max-Age': '86400',
};

/** Maximum number of redirect hops we will follow (prevents redirect loops). */
const MAX_REDIRECTS = 3;

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

/**
 * Load the domain allowlist from the CORS_PROXY_ALLOWLIST environment variable.
 * Format: comma-separated hostnames, e.g.
 *   "cdn.example.com,media.example.org,assets.another.com"
 *
 * Returns an empty array when the variable is missing or blank, which causes
 * all requests to be denied (fail-closed).
 */
export function loadAllowlist(): string[] {
  const raw = (process.env['CORS_PROXY_ALLOWLIST'] ?? '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedHost(hostname: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  const lower = hostname.toLowerCase();
  return allowlist.some((allowed) => lower === allowed || lower.endsWith(`.${allowed}`));
}

// ---------------------------------------------------------------------------
// Private / reserved IP detection (Edge-safe — no node:net available)
// ---------------------------------------------------------------------------

/**
 * Returns true if the hostname is a private, loopback, link-local, or
 * cloud-metadata IP address that must never be proxied.
 *
 * Covers:
 *   - IPv4 loopback:         127.0.0.0/8
 *   - RFC 1918:              10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Link-local / metadata: 169.254.0.0/16  (AWS/GCP/Azure metadata)
 *   - Shared address space:  100.64.0.0/10
 *   - Reserved zero block:   0.0.0.0/8
 *   - Multicast+:            224.0.0.0/4 and above
 *   - IPv6 loopback:         ::1
 *   - IPv6 link-local:       fe80::/10
 *   - IPv6 ULA:              fc00::/7
 */
function normalizeHostname(hostname: string): string | null {
  try {
    const probe = hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname;
    const parsed = new URL(`https://${probe}`).hostname;
    return parsed.startsWith('[') && parsed.endsWith(']') ? parsed.slice(1, -1) : parsed;
  } catch {
    return null;
  }
}

function ipv4FromEmbeddedIpv6(lower: string): string | null {
  if (!lower.startsWith('::ffff:') && !lower.startsWith('::')) return null;
  const parts = lower.split(':');
  const lastPart = parts.at(-1) ?? '';
  if (lastPart.includes('.')) return lastPart;
  const hexParts = parts.slice(-2);
  if (hexParts.length !== 2 || !hexParts.every((p) => /^[0-9a-f]{1,4}$/.test(p) || p === '')) return null;
  const highPart = hexParts[0] === '' ? 0 : Number.parseInt(hexParts[0], 16);
  const lowPart = hexParts[1] === '' ? 0 : Number.parseInt(hexParts[1], 16);
  return `${(highPart >> 8) & 0xff}.${highPart & 0xff}.${(lowPart >> 8) & 0xff}.${lowPart & 0xff}`;
}

function isReservedIpv6(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  if (lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  const embeddedIpv4 = ipv4FromEmbeddedIpv6(lower);
  return embeddedIpv4 ? isPrivateOrReservedIp(embeddedIpv4) : false;
}

function isReservedIpv4(normalized: string): boolean {
  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return false;
  const [a, b] = octets;
  return a === 127 || a === 0 || a === 10 || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export function isPrivateOrReservedIp(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  return normalized.includes(':') ? isReservedIpv6(normalized) : isReservedIpv4(normalized);
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

type UrlValidation = {
  ok: true;
  url: string;
  hostname: string;
} | {
  ok: false;
  status: number;
  error: string;
};

export function validateProxyUrl(raw: string, allowlist: string[]): UrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, status: 400, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, status: 400, error: 'Only HTTPS sources are allowed.' };
  }

  const hostname = parsed.hostname;

  if (isPrivateOrReservedIp(hostname)) {
    return { ok: false, status: 403, error: 'Proxying to private or reserved IP ranges is not allowed.' };
  }

  if (!isAllowedHost(hostname, allowlist)) {
    return { ok: false, status: 403, error: `Host '${hostname}' is not on the proxy allowlist.` };
  }

  return { ok: true, url: parsed.toString(), hostname };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function buildProxyHeaders(request: Request): Headers {
  const h = new Headers();
  const range = request.headers.get('Range');
  if (range) h.set('Range', range);
  const accept = request.headers.get('Accept');
  if (accept) h.set('Accept', accept);
  return h;
}

function buildResponseHeaders(upstream: Response): Headers {
  const responseHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(k, v);
  }
  responseHeaders.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Content-Type',
  );
  return responseHeaders;
}

// ---------------------------------------------------------------------------
// Proxy engine — redirect-safe fetch loop
// ---------------------------------------------------------------------------

/**
 * Fetch `startUrl` following up to `MAX_REDIRECTS` hops.
 * Each redirect Location is validated through the allowlist + IP checks
 * before being followed, preventing SSRF via open-redirect chains.
 */
async function proxyWithRedirects(
  startUrl: string,
  method: string,
  proxyHeaders: Headers,
  allowlist: string[],
): Promise<Response> {
  let currentUrl = startUrl;
  let hopsRemaining = MAX_REDIRECTS;

  while (hopsRemaining >= 0) {
    const upstream = await fetch(currentUrl, {
      method,
      headers: proxyHeaders,
      redirect: 'manual', // validate each hop ourselves
    });

    if (upstream.status < 300 || upstream.status >= 400) {
      // Non-redirect — return the proxied response.
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: buildResponseHeaders(upstream),
      });
    }

    // Redirect path
    if (hopsRemaining === 0) {
      return errorResponse(502, 'Too many redirects from upstream source.');
    }
    const location = upstream.headers.get('Location');
    if (!location) {
      return errorResponse(502, 'Upstream returned a redirect with no Location header.');
    }
    const redirectUrl = new URL(location, currentUrl).toString();
    const redirectValidation = validateProxyUrl(redirectUrl, allowlist);
    if (!redirectValidation.ok) {
      const blockedHost = new URL(location, currentUrl).hostname;
      return errorResponse(403, `Redirect to '${blockedHost}' is not allowed.`);
    }
    currentUrl = redirectValidation.url;
    hopsRemaining--;
  }

  return errorResponse(502, 'Proxy redirect loop detected.');
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Edge Cost Telemetry
// ---------------------------------------------------------------------------

/** Configurable cost rate: micro-dollars per millisecond of compute */
const EDGE_COST_RATE_MICROS = 0.0125; // ~$0.045/hr continuous

function generateEdgeRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36)).join('').slice(0, 8);
  return `edge-${ts}-${rand}`;
}

function addTelemetryHeaders(
  response: Response,
  requestId: string,
  durationMs: number,
): Response {
  const costMicros = Math.round(durationMs * EDGE_COST_RATE_MICROS * 1000) / 1000;
  const headers = new Headers(response.headers);
  headers.set('X-APEX-Edge-Duration-Ms', String(Math.round(durationMs * 1000) / 1000));
  headers.set('X-APEX-Edge-Cost-Micros', String(costMicros));
  headers.set('X-APEX-Request-Id', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(request: Request): Promise<Response> {
  const requestId = generateEdgeRequestId();
  const startTime = performance.now();

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const allowlist = loadAllowlist();
  if (allowlist.length === 0) {
    return errorResponse(403, 'CORS proxy is not configured. Set CORS_PROXY_ALLOWLIST.');
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  if (!source) {
    return errorResponse(400, 'Missing required "source" query parameter.');
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(source);
  } catch {
    return errorResponse(400, 'Malformed "source" query parameter (URL decoding failed).');
  }

  const validation = validateProxyUrl(decodedUrl, allowlist);
  if (!validation.ok) {
    return errorResponse(validation.status, validation.error);
  }

  try {
    const response = await proxyWithRedirects(
      validation.url,
      request.method,
      buildProxyHeaders(request),
      allowlist,
    );
    const durationMs = performance.now() - startTime;
    return addTelemetryHeaders(response, requestId, durationMs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return errorResponse(502, `Proxy fetch failed: ${message}`);
  }
}
