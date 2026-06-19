/**
 * Tests for graceful-degradation behavior of the distributed rate limiter.
 * Covers the operator-misconfiguration vs runtime-outage distinction so a
 * never-provisioned Upstash backend cannot silently brick an endpoint.
 * Run: deno test supabase/functions/_shared/rate-limit.test.ts --allow-env
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "./rate-limit.ts";

const cfg = RATE_LIMIT_CONFIGS.apexAgent;
function clearEnv() {
  Deno.env.delete("UPSTASH_REDIS_REST_URL");
  Deno.env.delete("UPSTASH_REDIS_REST_TOKEN");
  Deno.env.delete("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED");
}

Deno.test("unconfigured + flag unset => fail CLOSED (unchanged default)", async () => {
  clearEnv();
  const r = await checkRateLimit("u-closed", cfg);
  assertEquals(r.allowed, false);
  assertEquals(r.headers.get("X-RateLimit-Limit"), null);
});

Deno.test("unconfigured + opt-in flag => fail OPEN (graceful)", async () => {
  clearEnv();
  Deno.env.set("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED", "true");
  const r = await checkRateLimit("u-open", cfg);
  assertEquals(r.allowed, true);
  assertEquals(r.remaining, cfg.maxRequests);
  assertEquals(r.headers.get("X-RateLimit-Limit"), String(cfg.maxRequests));
  clearEnv();
});

Deno.test("flag does NOT bypass an explicit limiter denial (security preserved)", async () => {
  clearEnv();
  Deno.env.set("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED", "true");
  const r = await checkRateLimit("u-denied", cfg, {
    clientOverride: {
      limit: async () => ({ success: false, limit: cfg.maxRequests, remaining: 0, reset: Date.now() + 1000 }),
    },
  });
  assertEquals(r.allowed, false);
  clearEnv();
});
