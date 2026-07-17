/**
 * edge/omniboard-probe.ts
 * Cloudflare Worker — App Probe endpoint
 *
 * Route:  POST /api/omniboard/probe
 * Body:   { url: string }
 * Result: { q1: string | null, confidence: 'high' | 'low' }
 *
 * Probes a target URL to detect authentication method.
 * Falls back gracefully — if any signal fails the wizard still works.
 *
 * wrangler.toml addition required:
 *   [browser]
 *   binding = "BROWSER"
 */

interface Env {
  // BROWSER binding is declared but intentionally not used in this lightweight
  // header-probe implementation. Full Browser Rendering (screenshot/DOM parse)
  // would require it for JS-rendered auth flows. Adding the binding now makes
  // the worker forward-compatible without needing a redeployment.
  BROWSER?: unknown;
}

interface ProbeRequest {
  url: string;
}

interface ProbeResponse {
  q1: string | null;
  confidence: 'high' | 'low';
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin':  '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    let body: ProbeRequest;
    try {
      body = await request.json<ProbeRequest>();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { url } = body;
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'url is required' }, { status: 400 });
    }

    // Normalise — ensure scheme present
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    // Fire 3 probe requests in parallel — all non-fatal
    const [oidcResult, oauthResult, headResult] = await Promise.allSettled([
      fetch(`${targetUrl}/.well-known/openid-configuration`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4_000),
      }),
      fetch(`${targetUrl}/oauth/authorize`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4_000),
      }),
      fetch(targetUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4_000),
      }),
    ]);

    const headResponse =
      headResult.status === 'fulfilled' ? headResult.value : null;

    const hasOAuth     = oidcResult.status  === 'fulfilled' && oidcResult.value.ok;
    const hasOAuthPath = oauthResult.status === 'fulfilled' && oauthResult.value.ok;
    const wwwAuth      = headResponse?.headers.get('www-authenticate') ?? '';
    const hasApiKeyHint = /apikey|api[._-]?key|bearer/i.test(wwwAuth);

    // Deterministic signal → Q1 answer map
    let q1: string | null = null;
    let confidence: 'high' | 'low' = 'low';

    if (hasOAuth || hasOAuthPath) {
      q1 = 'OAuth';
      confidence = 'high';
    } else if (hasApiKeyHint) {
      q1 = 'API Key';
      confidence = 'high';
    }
    // null q1 with low confidence — user must answer manually

    const result: ProbeResponse = { q1, confidence };

    return Response.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  },
};
