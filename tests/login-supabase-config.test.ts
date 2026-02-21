/**
 * OMNI-TEST: Login Supabase Config Guard
 * ────────────────────────────────────────
 * Tests the hasSupabaseConfig logic that gates the login flow.
 * Root cause: envDir mismatch caused VITE_SUPABASE_URL to be empty,
 * making hasSupabaseConfig = false → "temporarily unavailable."
 *
 * Test types: Unit (Tier 1) + Smoke (Tier 1)
 * Pattern: AAA (Arrange-Act-Assert)
 * Naming: Given_When_Then
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ─── UNIT TESTS: hasSupabaseConfig logic ───────────────────────────

/**
 * Mirrors the exact logic from apps/omnihub-site/src/lib/supabase.ts:5-7:
 *   const hasValidSupabaseUrl = /^https?:\/\//i.test(supabaseUrl);
 *   export const hasSupabaseConfig = hasValidSupabaseUrl && supabaseAnonKey.length > 0;
 */
function evaluateHasSupabaseConfig(url: string, anonKey: string): boolean {
  const hasValidSupabaseUrl = /^https?:\/\//i.test(url);
  return hasValidSupabaseUrl && anonKey.length > 0;
}
describe("hasSupabaseConfig guard (supabase.ts logic)", () => {
  // ── Happy Path ──
  it("should_return_true_when_valid_https_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      "https://rtopreovkywofgwgmozi.supabase.co",
      "eyJhbGciOiJ..."
    );
    expect(result).toBe(true);
  });

  it("should_return_true_when_valid_http_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      "http://localhost:54321",
      "some-local-key"
    );
    expect(result).toBe(true);
  });

  // ── Edge Cases (THE BUG SCENARIO) ──
  it("should_return_false_when_url_is_empty_string", () => {
    // THIS IS THE EXACT BUG: import.meta.env.VITE_SUPABASE_URL ?? '' → ''
    const result = evaluateHasSupabaseConfig("", "valid-key");
    expect(result).toBe(false);
  });

  it("should_return_false_when_anon_key_is_empty_string", () => {
    const result = evaluateHasSupabaseConfig("https://valid.supabase.co", "");
    expect(result).toBe(false);
  });

  it("should_return_false_when_both_are_empty_strings", () => {
    const result = evaluateHasSupabaseConfig("", "");
    expect(result).toBe(false);
  });

  it("should_return_false_when_url_has_no_protocol", () => {
    const result = evaluateHasSupabaseConfig(
      "rtopreovkywofgwgmozi.supabase.co",
      "valid-key"
    );
    expect(result).toBe(false);
  });

  it("should_return_false_when_url_is_placeholder", () => {
    // The fallback in supabase.ts: hasValidSupabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co'
    // But hasSupabaseConfig checks the ORIGINAL var, not the fallback
    const result = evaluateHasSupabaseConfig(
      "placeholder",
      "placeholder-anon-key"
    );
    expect(result).toBe(false);
  });
});

// ─── SMOKE TEST: vite.config.ts has envDir ──────────────────────────
describe("vite.config.ts envDir fix (smoke test)", () => {
  const viteConfigPath = resolve(
    __dirname,
    "../apps/omnihub-site/vite.config.ts"
  );

  it("should_have_envDir_directive_pointing_to_monorepo_root", () => {
    expect(existsSync(viteConfigPath)).toBe(true);
    const content = readFileSync(viteConfigPath, "utf-8");
    expect(content).toContain("envDir");
    // Must resolve to ../../ (monorepo root from apps/omnihub-site/)
    expect(content).toMatch(/envDir.*['"]\.\.\/\.\.\/['"]/);
  });

  it("should_have_resolve_import_for_dirname_usage", () => {
    const content = readFileSync(viteConfigPath, "utf-8");
    expect(content).toContain("from 'node:path'");
    expect(content).toContain("__dirname");
  });
});

// ─── SMOKE TEST: .env file has required vars ────────────────────────
describe("monorepo root .env contains Supabase credentials", () => {
  const envPath = resolve(__dirname, "../.env");

  it("should_have_VITE_SUPABASE_URL_with_https_value", () => {
    if (!existsSync(envPath)) {
      // .env might not exist in CI — skip gracefully
      return;
    }
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_SUPABASE_URL=https:\/\//m);
  });

  it("should_have_VITE_SUPABASE_ANON_KEY_with_nonempty_value", () => {
    if (!existsSync(envPath)) {
      return;
    }
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_SUPABASE_ANON_KEY=.{10,}/m);
  });
});
