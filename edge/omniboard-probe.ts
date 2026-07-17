/**
 * omniboard-probe — Cloudflare Worker
 *
 * Silently probes a target URL to pre-fill the IntegrationOnboarder wizard
 * with the most likely auth method (Q1 answer).
 *
 * POST /api/omniboard/probe
 * Body: { url: string }
 * Returns: { q1: 'OAuth' | 'API Key' | null, confidence: 'high' | 'low' }
 *
 * Degrades gracefully: if any probe fails the wizard still works normally.
 *
 * wrangler.toml requirement:
 * [browser]
 * binding = "BROWSER"
 */
interface Env {
  BROWSER?: unknown; // Cloudflare Browser Rendering binding (optional — not used in probe logic)
}

interface ProbeRequest {
  url: string;
}

interface ProbeResponse {
  q1: 'OAuth' | 'API Key' | null;
  confidence: 'high' | 'low';
}

// ---------------------------------------------------------------------------
// Header hint matchers — written as simple string literals to avoid regex
// backtracking issues (SonarQube S5852). Case-insensitive comparison is
// performed via String#toLowerCase() rather than the /i flag.
// ---------------------------------------------------------------------------
const API_KEY_HINTS = ['apikey', 'api_key', 'api-key', 'bearer'] as const;

function hasApiKeyHint(wwwAuth: string): boolean {
  const lower = wwwAuth.toLowerCase();
  return API_KEY_HINTS.some((hint) => lower.includes(hint));
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let body: ProbeRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ q1: null, confidence: 'low' } satisfies ProbeResponse);
    }

    const { url } = body;
    if (!url || typeof url !== 'string') {
      return Response.json({ q1: null, confidence: 'low' } satisfies ProbeResponse);
    }

    // Normalise — strip trailing slashes without regex (avoids S5852)
    let trimEnd = url.length;
    while (trimEnd > 0 && url[trimEnd - 1] === '/') trimEnd--;
    const base = url.slice(0, trimEnd)

    // Fire 3 HEAD probes concurrently with a 4s timeout each
    const [oidcResult, oauthResult, rootResult] = await Promise.allSettled([
      fetch(`${base}/.well-known/openid-configuration`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      }),
      fetch(`${base}/oauth/authorize`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      }),
      fetch(base, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      }),
    ]);

    // Extract signals
    const hasOidc = oidcResult.status === 'fulfilled' && oidcResult.value.ok;
    const hasOAuthPath = oauthResult.status === 'fulfilled' && oauthResult.value.ok;
    const rootResponse = rootResult.status === 'fulfilled' ? rootResult.value : null;
    const wwwAuth = rootResponse?.headers.get('www-authenticate') ?? '';

    // Determine answer + confidence
    let q1: ProbeResponse['q1'] = null;
    let confidence: ProbeResponse['confidence'] = 'low';

    if (hasOidc || hasOAuthPath) {
      q1 = 'OAuth';
      confidence = 'high';
    } else if (hasApiKeyHint(wwwAuth)) {
      q1 = 'API Key';
      confidence = 'high';
    }

    // All other cases: q1 = null, confidence = 'low' — wizard shows all options unselected
    return Response.json({ q1, confidence } satisfies ProbeResponse);
  },
};
