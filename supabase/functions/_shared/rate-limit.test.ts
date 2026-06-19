/**
 * Tests for graceful-degradation behavior of the distributed rate limiter.
 * Covers all six cases required by the reviewer:
 *   1. absent + flag unset             → denied
 *   2. absent + RATE_LIMIT_FAIL_OPEN_UNCONFIGURED=true → allowed
 *   3. URL-only partial + flag true    → denied (misconfiguration ≠ unconfigured)
 *   4. TOKEN-only partial + flag true  → denied (misconfiguration ≠ unconfigured)
 *   5. limiter runtime error           → denied (fail-closed even under flag)
 *   6. explicit limiter denial         → denied even if flag is true
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

Deno.test("URL-only partial config + opt-in flag => fail CLOSED (misconfiguration)", async () => {
  clearEnv();
  Deno.env.set("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
  Deno.env.set("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED", "true");
  const r = await checkRateLimit("u-partial-url", cfg);
  assertEquals(r.allowed, false);
  clearEnv();
});

Deno.test("TOKEN-only partial config + opt-in flag => fail CLOSED (misconfiguration)", async () => {
  clearEnv();
  Deno.env.set("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  Deno.env.set("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED", "true");
  const r = await checkRateLimit("u-partial-token", cfg);
  assertEquals(r.allowed, false);
  clearEnv();
});

Deno.test("limiter runtime error (clientOverride throws) => fail CLOSED regardless of flag", async () => {
  clearEnv();
  Deno.env.set("RATE_LIMIT_FAIL_OPEN_UNCONFIGURED", "true");
  const r = await checkRateLimit("u-runtime-err", cfg, {
    clientOverride: {
      limit: async (_key: string) => { throw new Error("Upstash network timeout"); },
    },
  });
  assertEquals(r.allowed, false);
  clearEnv();
});
