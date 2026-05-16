/**
 * APEX EdgeCORSProxy — Stateless Edge Worker
 * @version 1.0.0
 * @module edge/cors-proxy/edge-cors-proxy
 *
 * Deployed to: https://cors.apexomnihub.icu/
 * Usage:       https://cors.apexomnihub.icu/?source=<encoded-media-url>
 *
 * Force-injects Access-Control-Allow-Origin on proxied media responses
 * to guarantee Web Audio API interception for the OmniMedia Engine.
 *
 * APEX STANDARDS ENFORCED:
 * - Stateless: No server-side storage — pure stream proxy
 * - Fail-Closed: Missing source param → 400, bad upstream → propagated status
 * - Security: Only GET/HEAD/OPTIONS methods permitted
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const JSON_HEADERS = { 'Content-Type': 'application/json', ...CORS_HEADERS };
const EDGE_USER_AGENT = 'APEX-OmniMedia-EdgeProxy/1.0';

function isAllowedProxyMethod(method) {
  return method === 'GET' || method === 'HEAD';
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

function parseTargetUrl(targetUrl) {
  if (!targetUrl) {
    return { errorResponse: jsonError('APEX OmniMedia: Missing source parameter', 400) };
  }

  try {
    return { target: new URL(targetUrl) };
  } catch {
    return { errorResponse: jsonError('APEX OmniMedia: Invalid source URL', 400) };
  }
}

function buildUpstreamHeaders(request) {
  const headers = { 'User-Agent': EDGE_USER_AGENT };
  const range = request.headers.get('Range');

  // Forward byte-range requests only when the client supplied a concrete range.
  if (range) {
    headers.Range = range;
  }

  return headers;
}

function withCorsHeaders(upstream) {
  const proxyResponse = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    proxyResponse.headers.set(key, value);
  }

  return proxyResponse;
}

export default {
  /**
   * @param {Request} request - Incoming edge request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (!isAllowedProxyMethod(request.method)) {
      return jsonError('APEX OmniMedia: Method not allowed', 405);
    }

    const requestUrl = new URL(request.url);
    const { target, errorResponse } = parseTargetUrl(requestUrl.searchParams.get('source'));

    if (errorResponse) {
      return errorResponse;
    }

    try {
      const upstream = await fetch(target.href, {
        method: request.method,
        headers: buildUpstreamHeaders(request),
      });

      return withCorsHeaders(upstream);
    } catch {
      return jsonError('APEX OmniMedia: Upstream fetch failed', 502);
    }
  },
};
