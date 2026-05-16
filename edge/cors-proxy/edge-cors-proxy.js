/**
 * APEX EdgeCORSProxy — Stateless Edge Worker
 * @version 1.1.0
 * @module edge/cors-proxy/edge-cors-proxy
 *
 * Deployed to: https://cors.apexomnihub.icu/
 * Usage:       https://cors.apexomnihub.icu/?source=<encoded-media-url>
 */

const MAX_UPSTREAM_BYTES = 25 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_METHODS = 'GET, HEAD, OPTIONS';
const ALLOWED_ORIGIN_HOSTS = new Set([
  'apexomnihub.icu',
  'www.apexomnihub.icu',
  'cors.apexomnihub.icu',
  'status.apexomnihub.icu',
  'omnihub.dev',
  'staging.omnihub.dev',
  'localhost',
  '127.0.0.1',
  'apex-omnihub.pages.dev',
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (ALLOWED_ORIGIN_HOSTS.has(parsed.hostname) ||
        parsed.hostname.endsWith('.apexomnihub.icu') ||
        parsed.hostname.endsWith('.apex-omnihub.pages.dev'));
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
    'Vary': 'Origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };

  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function jsonResponse(message, status, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function isPlainIPv4(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isIpLiteral(hostname) {
  return isPlainIPv4(hostname) || hostname.includes(':');
}

function isBlockedIPv4(hostname) {
  if (!isPlainIPv4(hostname)) return false;
  const parts = hostname.split('.').map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isUnsafeHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!normalized || normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === 'metadata.google.internal') return true;
  if (/^(0x|0)[0-9a-f.]+$/i.test(normalized) || /^\d+$/.test(normalized)) return true;
  if (isIpLiteral(normalized)) {
    // Disallow IP literals entirely; DNS names are required so private/reserved IP bypass forms cannot be smuggled.
    return true;
  }
  return isBlockedIPv4(normalized);
}

function validateTargetUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'APEX OmniMedia: Invalid source URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'APEX OmniMedia: HTTPS source URL required' };
  }

  if (isUnsafeHostname(parsed.hostname)) {
    return { ok: false, error: 'APEX OmniMedia: Source host is not allowed' };
  }

  parsed.username = '';
  parsed.password = '';
  return { ok: true, url: parsed };
}

async function fetchWithSafeRedirects(targetUrl, request) {
  let currentUrl = targetUrl;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const upstream = await fetch(currentUrl, {
      method: request.method,
      redirect: 'manual',
      headers: {
        'User-Agent': 'APEX-OmniMedia-EdgeProxy/1.1',
        ...(request.headers.get('Range') ? { Range: request.headers.get('Range') } : {}),
      },
    });

    if (![301, 302, 303, 307, 308].includes(upstream.status)) {
      return upstream;
    }

    const location = upstream.headers.get('Location');
    if (!location) return upstream;
    const nextUrl = new URL(location, currentUrl).toString();
    const validation = validateTargetUrl(nextUrl);
    if (!validation.ok) {
      throw new Error('unsafe_redirect');
    }
    currentUrl = validation.url.toString();
  }

  throw new Error('too_many_redirects');
}

function enforceContentLength(upstream) {
  const contentLength = upstream.headers.get('Content-Length');
  return !(contentLength && Number(contentLength) > MAX_UPSTREAM_BYTES);
}

function sanitizeUpstreamHeaders(headers) {
  const sanitized = new Headers(headers);
  sanitized.delete('Set-Cookie');
  sanitized.delete('Set-Cookie2');
  return sanitized;
}

function capBodyStream(body) {
  if (!body) return body;
  let totalBytes = 0;
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      totalBytes += chunk.byteLength || 0;
      if (totalBytes > MAX_UPSTREAM_BYTES) {
        controller.error(new Error('upstream_too_large'));
        return;
      }
      controller.enqueue(chunk);
    },
  }));
}

export { MAX_UPSTREAM_BYTES, corsHeaders, isAllowedOrigin, isUnsafeHostname, validateTargetUrl };

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return jsonResponse('APEX OmniMedia: Method not allowed', 405, origin);
    }

    if (request.method === 'OPTIONS') {
      if (origin && !isAllowedOrigin(origin)) {
        return jsonResponse('APEX OmniMedia: Origin not allowed', 403, origin);
      }
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (origin && !isAllowedOrigin(origin)) {
      return jsonResponse('APEX OmniMedia: Origin not allowed', 403, origin);
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('source');

    if (!targetUrl) {
      return jsonResponse('APEX OmniMedia: Missing source parameter', 400, origin);
    }

    const validation = validateTargetUrl(targetUrl);
    if (!validation.ok) {
      return jsonResponse(validation.error, 400, origin);
    }

    try {
      const upstream = await fetchWithSafeRedirects(validation.url.toString(), request);
      if (!enforceContentLength(upstream)) {
        return jsonResponse('APEX OmniMedia: Upstream response too large', 413, origin);
      }

      const proxyResponse = new Response(capBodyStream(upstream.body), {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: sanitizeUpstreamHeaders(upstream.headers),
      });

      Object.entries(corsHeaders(origin)).forEach(([key, value]) => proxyResponse.headers.set(key, value));

      return proxyResponse;
    } catch (error) {
      if (error instanceof Error && error.message === 'unsafe_redirect') {
        return jsonResponse('APEX OmniMedia: Unsafe upstream redirect', 400, origin);
      }
      return jsonResponse('APEX OmniMedia: Upstream fetch failed', 502, origin);
    }
  },
};
