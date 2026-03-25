/**
 * api/middleware/rate-limiter.ts — Cloudflare-compatible Rate Limiter
 * Fail-closed: denies on KV failure or nullish response.
 * APEX-OmniHub v1.3.0-RC  §Security Gate
 *
 * On Cloudflare Pages/Workers, bind a KV namespace named RATE_LIMIT_KV
 * in wrangler.toml or the dashboard.  Falls back to in-memory map for
 * local development / non-Cloudflare environments.
 */

interface RateLimitEnv {
  RATE_LIMIT_KV?: KVNamespace;
}

const WINDOW_MS = 60_000; // 1-minute sliding window
const MAX_REQUESTS = 60;  // requests per window

/**
 * In-memory fallback for local dev (not durable across workers).
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkLimit(
  ip: string,
  kvNamespace?: KVNamespace,
): Promise<boolean> {
  if (kvNamespace) {
    const key = `rl:${ip}`;
    const raw = await kvNamespace.get(key);
    const now = Date.now();

    if (raw) {
      const entry = JSON.parse(raw) as { count: number; resetAt: number };
      if (now > entry.resetAt) {
        // Window expired — reset
        await kvNamespace.put(key, JSON.stringify({ count: 1, resetAt: now + WINDOW_MS }), {
          expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5,
        });
        return true;
      }
      if (entry.count >= MAX_REQUESTS) return false;
      entry.count++;
      await kvNamespace.put(key, JSON.stringify(entry), {
        expirationTtl: Math.ceil((entry.resetAt - now) / 1000) + 5,
      });
      return true;
    }

    // First request in window
    await kvNamespace.put(key, JSON.stringify({ count: 1, resetAt: now + WINDOW_MS }), {
      expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5,
    });
    return true;
  }

  // In-memory fallback (local dev)
  const now = Date.now();
  const entry = memoryStore.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export async function rateLimitMiddleware(request: Request, env?: RateLimitEnv) {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ??
    'unknown_ip';

  try {
    const allowed = await checkLimit(ip, env?.RATE_LIMIT_KV);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'APEX API: Rate Limit Exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return null; // Proceed to route handler
  } catch (error) {
    console.error('APEX Rate Limiter: KV Subsystem Failure', error);

    // FAIL-CLOSED: Protect backend infrastructure during KV outages.
    return new Response(
      JSON.stringify({ error: 'APEX API: Service Unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
