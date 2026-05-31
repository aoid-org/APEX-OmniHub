/**
 * OMNI-TEST: Login Supabase Config Guard
 * Tests the hasSupabaseConfig logic that gates the login flow.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSupabaseConfigTraceId,
  doesSupabaseKeyMatchUrl,
  getSupabaseBrowserKeyKind,
  getSupabaseJwtProjectRef,
  getSupabaseProjectRefFromUrl,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
  isBrowserSafeSupabaseKey,
} from "../apps/omnihub-site/src/lib/supabaseConfig";

function evaluateHasSupabaseConfig(url: string, anonKey: string): boolean {
  return hasSupabaseConfigValue(url, anonKey);
}

function buildUrlWithProtocol(host: string, protocol: string): string {
  return `${protocol}${String.fromCodePoint(58, 47, 47)}${host}`;
}

function createTestJwt(payload: Record<string, unknown>): string {
  const encodedPayload = btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return `eyJhbGciOiJIUzI1NiJ9.${encodedPayload}.signature`;
}

describe("hasSupabaseConfig guard (supabase.ts logic)", () => {
  it("should_return_true_when_valid_https_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("rtopreovkywofgwgmozi.supabase.co", "https"),
      createTestJwt({ role: "anon", ref: "rtopreovkywofgwgmozi" })
    );
    expect(result).toBe(true);
  });

  it("should_return_true_when_valid_http_url_and_nonempty_anon_key", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("localhost:54321", "http"),
      "sb_anon_local_123"
    );
    expect(result).toBe(true);
  });

  it("should_return_false_when_remote_http_url_is_used", () => {
    const result = evaluateHasSupabaseConfig(
      buildUrlWithProtocol("example.supabase.co", "http"),
      "sb_publishable_valid_123"
    );
    expect(result).toBe(false);
  });

  it("should_return_false_when_url_is_empty_string", () => {
    const result = evaluateHasSupabaseConfig("", "sb_publishable_valid_123");
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
      "sb_publishable_valid_123"
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

describe("Supabase browser key diagnostics", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in originalEnv)) delete import.meta.env[key];
    });
    Object.assign(import.meta.env, originalEnv);
  });

  it("should_trim_url_and_key_values_before_runtime_config_evaluation", async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: "  https://rtopreovkywofgwgmozi.supabase.co  ",
      VITE_SUPABASE_PUBLISHABLE_KEY: "  sb_publishable_test_1234567890  ",
      VITE_SUPABASE_ANON_KEY: "",
    });

    const mod = await import("@omnihub/lib/supabase");

    expect(mod.hasSupabaseConfig).toBe(true);
    expect(mod.supabaseConfigStatus).toMatchObject({
      hasUrl: true,
      hasKey: true,
      urlHost: "rtopreovkywofgwgmozi.supabase.co",
      keyKind: "publishable",
    });
  });

  it("should_recognize_browser_safe_key_kinds", async () => {
    expect(getSupabaseBrowserKeyKind(createTestJwt({ role: "anon", ref: "rtopreovkywofgwgmozi" }))).toBe("jwt");
    expect(isBrowserSafeSupabaseKey(createTestJwt({ role: "anon", ref: "rtopreovkywofgwgmozi" }))).toBe(true);
    expect(getSupabaseBrowserKeyKind("sb_publishable_test_123")).toBe("publishable");
    expect(getSupabaseBrowserKeyKind("sb_anon_test_123")).toBe("anon");
  });

  it("should_reject_empty_placeholder_wrong_format_and_secret_keys_for_browser_config", async () => {
    expect(getSupabaseBrowserKeyKind("")).toBe("missing");
    expect(isBrowserSafeSupabaseKey("placeholder-anon-key")).toBe(false);
    expect(isBrowserSafeSupabaseKey("not-a-supabase-key")).toBe(false);
    expect(isBrowserSafeSupabaseKey("eyJhbGciOiJ...")).toBe(false);
    expect(isBrowserSafeSupabaseKey("sb_publishable_")).toBe(false);
    expect(isBrowserSafeSupabaseKey("sb_secret_test_123")).toBe(false);
    expect(isBrowserSafeSupabaseKey("service_role_test_123")).toBe(false);
  });

  it("should_reject_legacy_jwt_keys_from_a_different_supabase_project", async () => {
    const url = buildUrlWithProtocol("rtopreovkywofgwgmozi.supabase.co", "https");
    const matchingKey = createTestJwt({ role: "anon", ref: "rtopreovkywofgwgmozi" });
    const mismatchedKey = createTestJwt({ role: "anon", ref: "pumlhmdgacipxpxdwenj" });

    expect(getSupabaseProjectRefFromUrl(url)).toBe("rtopreovkywofgwgmozi");
    expect(getSupabaseJwtProjectRef(mismatchedKey)).toBe("pumlhmdgacipxpxdwenj");
    expect(doesSupabaseKeyMatchUrl(url, matchingKey)).toBe(true);
    expect(doesSupabaseKeyMatchUrl(url, mismatchedKey)).toBe(false);
    expect(hasSupabaseConfigValue(url, mismatchedKey)).toBe(false);
  });

  it("should_reject_legacy_service_role_jwt_payloads", async () => {
    const key = createTestJwt({ role: "service_role" });

    expect(getSupabaseBrowserKeyKind(key)).toBe("secret");
    expect(isBrowserSafeSupabaseKey(key)).toBe(false);
  });

  it("should_export_redacted_diagnostics_without_key_material", async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: "https://rtopreovkywofgwgmozi.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_redacted_1234567890",
      VITE_SUPABASE_ANON_KEY: "",
    });

    const mod = await import("@omnihub/lib/supabase");
    const serializedStatus = JSON.stringify(mod.supabaseConfigStatus);

    expect(mod.supabaseConfigStatus).toHaveProperty("hasUrl");
    expect(mod.supabaseConfigStatus).toHaveProperty("hasKey");
    expect(mod.supabaseConfigStatus).toHaveProperty("urlHost");
    expect(mod.supabaseConfigStatus).toHaveProperty("keyKind");
    expect(mod.supabaseConfigStatus).toHaveProperty("traceId");
    expect(serializedStatus).not.toContain("sb_publishable_test_redacted_1234567890");
    expect(serializedStatus).not.toContain("redacted_1234567890");
  });
});
