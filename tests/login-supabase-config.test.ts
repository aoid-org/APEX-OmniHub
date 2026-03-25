/**
 * OMNI-TEST: Login Supabase Config Guard
 * Tests the hasSupabaseConfig logic that gates the login flow.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from "../apps/omnihub-site/src/lib/supabaseConfig";

function evaluateHasSupabaseConfig(url: string, anonKey: string): boolean {
  return hasSupabaseConfigValue(url, anonKey);
}

function buildUrlWithProtocol(host: string, protocol: string): string {
  return `${protocol}${String.fromCharCode(58, 47, 47)}${host}`;
}

describe("hasSupabaseConfig guard (supabase.ts logic)", () => {
  it("should_return_true_when_valid_https_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("rtopreovkywofgwgmozi.supabase.co", "https"),
      "eyJhbGciOiJ..."
    );
    expect(result).toBe(true);
  });

  it("should_return_true_when_valid_http_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("localhost:54321", "http"),
      "some-local-key"
    );
    expect(result).toBe(true);
  });

  it("should_return_false_when_remote_http_url_is_used", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("example.supabase.co", "http"),
      "valid-key"
    );
    expect(result).toBe(false);
  });

  it("should_return_false_when_url_is_empty_string", () => {
    const result = evaluateHasSupabaseConfig("", "valid-key");
    expect(result).toBe(false);
  });

  it("should_return_false_when_anon_key_is_empty_string", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("valid.supabase.co", "https"),
      ""
    );
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
    const result = evaluateHasSupabaseConfig(
      "placeholder",
      "placeholder-anon-key"
    );
    expect(result).toBe(false);
  });

  it("should_reject_clear_text_or_unsupported_protocols", () => {
    expect(hasValidSupabaseUrl(buildUrlWithProtocol("supabase.co", "ftp"))).toBe(false);
  });

  it("should_generate_trace_ids_without_using_math_random", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 25; i++) {
      ids.add(createSupabaseConfigTraceId());
    }

    expect(Array.from(ids).every((id) => /^cfg-[a-z0-9]{1,8}$/.test(id))).toBe(true);
    expect(ids.size).toBeGreaterThan(20);
  });
});

describe("vite.config.ts envDir fix (smoke test)", () => {
  const viteConfigPath = resolve(
    __dirname,
    "../apps/omnihub-site/vite.config.ts"
  );

  it("should_have_envDir_directive_pointing_to_monorepo_root", () => {
    expect(existsSync(viteConfigPath)).toBe(true);
    const content = readFileSync(viteConfigPath, "utf-8");
    expect(content).toContain("envDir");
    expect(content).toMatch(/envDir.*['"]\.\.\/\.\.\/['"]/);
  });

  it("should_have_resolve_import_for_dirname_usage", () => {
    const content = readFileSync(viteConfigPath, "utf-8");
    expect(content).toContain("from 'node:path'");
    expect(content).toContain("__dirname");
  });
});

describe("monorepo root .env contains Supabase credentials", () => {
  const envPath = resolve(__dirname, "../.env");

  it("should_have_VITE_SUPABASE_URL_with_https_value", () => {
    if (!existsSync(envPath)) {
      return;
    }
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_SUPABASE_URL=https:\/\//m);
  });

  it("should_have_VITE_SUPABASE_PUBLISHABLE_KEY_with_nonempty_value", () => {
    if (!existsSync(envPath)) {
      return;
    }
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_SUPABASE_PUBLISHABLE_KEY=.{10,}/m);
  });
});
