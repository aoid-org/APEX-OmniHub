/**
 * OMNI-TEST: Login Page Critical Fixes
 * ─────────────────────────────────────
 * Tests the three critical fixes for the login page:
 *   1. Broken logo → SVG fallback (LogoFallback component)
 *   2. Cryptic "Login is unavailable" → actionable error message + alert banner
 *   3. wrangler.toml empty [env.*] sections → env var injection blocked
 *
 * Test types: Unit (Tier 1) + Smoke (Tier 1) + Static Analysis (Tier 0)
 * Pattern: AAA (Arrange-Act-Assert)
 * Naming: Given_When_Then
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const LOGIN_TSX = resolve(
  __dirname,
  "../apps/omnihub-site/src/pages/Login.tsx"
);
const SUPABASE_TS = resolve(
  __dirname,
  "../apps/omnihub-site/src/lib/supabase.ts"
);
const WRANGLER_TOML = resolve(__dirname, "../wrangler.toml");
const ROOT_PUBLIC_ICON = resolve(__dirname, "../public/icon.png");
const SITE_PUBLIC_ICON = resolve(
  __dirname,
  "../apps/omnihub-site/public/icon.png"
);

// ─── FIX 1: Broken Logo → SVG Fallback ─────────────────────────────

describe("Login logo fallback (Fix #1: broken image)", () => {
  const loginSrc = readFileSync(LOGIN_TSX, "utf-8");

  it("should_have_LogoFallback_component_defined", () => {
    expect(loginSrc).toContain("function LogoFallback()");
  });

  it("should_render_inline_SVG_with_APEX_text_in_fallback", () => {
    expect(loginSrc).toMatch(/LogoFallback[\s\S]*<svg/);
    expect(loginSrc).toMatch(/<text[\s\S]*>[\s\S]*APEX[\s\S]*<\/text>/);
  });

  it("should_have_aria_label_for_accessibility", () => {
    expect(loginSrc).toContain('aria-label="APEX OmniHub"');
  });

  it("should_have_logoError_state_hook", () => {
    expect(loginSrc).toContain("const [logoError, setLogoError] = useState(false)");
  });

  it("should_have_onError_handler_on_img_tag", () => {
    expect(loginSrc).toContain("onError={() => setLogoError(true)}");
  });

  it("should_conditionally_render_SVG_when_logoError_is_true", () => {
    expect(loginSrc).toContain("{logoError ? (");
    expect(loginSrc).toContain("<LogoFallback />");
  });

  it("should_have_icon_png_in_root_public_directory", () => {
    expect(existsSync(ROOT_PUBLIC_ICON)).toBe(true);
  });

  it("should_have_matching_icon_in_both_public_directories", () => {
    expect(existsSync(ROOT_PUBLIC_ICON)).toBe(true);
    expect(existsSync(SITE_PUBLIC_ICON)).toBe(true);
    // Both files should exist — root for monorepo build, site for app build
    const rootSize = readFileSync(ROOT_PUBLIC_ICON).length;
    const siteSize = readFileSync(SITE_PUBLIC_ICON).length;
    expect(rootSize).toBe(siteSize);
  });

  it("should_reference_icon_png_with_absolute_path", () => {
    expect(loginSrc).toContain('src="/icon.png"');
  });
});

// ─── FIX 2: Cryptic Error → Actionable Message + Alert Banner ───────

describe("Login error messaging (Fix #2: cryptic error)", () => {
  const loginSrc = readFileSync(LOGIN_TSX, "utf-8");

  it("should_NOT_contain_old_cryptic_error_message", () => {
    // Old: setError(`Login is unavailable. Trace: ${supabaseConfigTraceId}`)
    expect(loginSrc).not.toMatch(/Login is unavailable\. Trace:/);
  });

  it("should_have_descriptive_error_with_admin_guidance", () => {
    expect(loginSrc).toContain("Login is temporarily unavailable");
    expect(loginSrc).toContain("authentication service is not configured");
    expect(loginSrc).toContain("Contact your administrator");
  });

  it("should_preserve_trace_id_in_error_message_for_debugging", () => {
    // Trace ID must still be present for operator diagnostics
    expect(loginSrc).toMatch(/Trace:.*supabaseConfigTraceId/);
  });

  it("should_show_proactive_alert_banner_when_config_missing", () => {
    expect(loginSrc).toContain('{!hasSupabaseConfig && (');
    expect(loginSrc).toContain('role="alert"');
  });

  it("should_display_exact_env_var_names_in_alert_banner", () => {
    expect(loginSrc).toContain("VITE_SUPABASE_URL");
    expect(loginSrc).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });

  it("should_reference_cloudflare_pages_in_alert_banner", () => {
    expect(loginSrc).toContain("Cloudflare Pages");
  });

  it("should_show_strong_heading_in_alert_banner", () => {
    expect(loginSrc).toContain(
      "<strong>Authentication service not configured.</strong>"
    );
  });

  it("should_include_trace_id_in_alert_banner", () => {
    // The banner should also show the trace ID
    expect(loginSrc).toMatch(/Trace:.*supabaseConfigTraceId/);
  });
});

// ─── FIX 3: wrangler.toml empty [env.*] sections ───────────────────

describe("wrangler.toml config (Fix #3: env var injection)", () => {
  it("should_exist_at_monorepo_root", () => {
    expect(existsSync(WRANGLER_TOML)).toBe(true);
  });

  const wranglerContent = existsSync(WRANGLER_TOML)
    ? readFileSync(WRANGLER_TOML, "utf-8")
    : "";

  it("should_have_pages_build_output_dir", () => {
    expect(wranglerContent).toContain('pages_build_output_dir = "dist"');
  });

  it("should_have_compatibility_date", () => {
    expect(wranglerContent).toMatch(/compatibility_date\s*=\s*"20\d{2}-\d{2}-\d{2}"/);
  });

  it("should_NOT_have_env_production_section_that_blocks_dashboard_vars", () => {
    // Empty [env.production] sections cause CF Pages to scope env vars
    // away from the build, blocking VITE_* injection.
    // The fix: remove these sections entirely so dashboard vars flow through.
    // Only match actual TOML headers (start of line), not comments mentioning them.
    const hasEnvProductionSection = /^\[env\.production\]/m.test(wranglerContent);
    expect(hasEnvProductionSection).toBe(false);
  });

  it("should_NOT_have_env_preview_section_that_blocks_dashboard_vars", () => {
    const hasEnvPreviewSection = /^\[env\.preview\]/m.test(wranglerContent);
    expect(hasEnvPreviewSection).toBe(false);
  });

  it("should_NOT_contain_any_real_supabase_credentials", () => {
    // Security: wrangler.toml is committed to git — no real keys allowed
    expect(wranglerContent).not.toMatch(/eyJhbGci/); // JWT prefix
    expect(wranglerContent).not.toMatch(/rtopreovkywofgwgmozi/); // Project ref
    expect(wranglerContent).not.toMatch(/sb_publishable_/); // Supabase key prefix
  });

  it("should_have_project_name", () => {
    expect(wranglerContent).toContain('name = "apex-omnihub"');
  });
});

// ─── CROSS-CUTTING: supabase.ts config guard integrity ──────────────

describe("supabase.ts config guard integrity", () => {
  const supabaseSrc = readFileSync(SUPABASE_TS, "utf-8");

  it("should_export_hasSupabaseConfig_boolean", () => {
    expect(supabaseSrc).toContain("export const hasSupabaseConfig");
  });

  it("should_export_supabaseConfigTraceId", () => {
    expect(supabaseSrc).toContain("export const supabaseConfigTraceId");
  });

  it("should_validate_url_with_https_or_http_protocol", () => {
    expect(supabaseSrc).toMatch(/\/\^https\?:.*test\(supabaseUrl\)/);
  });

  it("should_check_both_publishable_key_and_anon_key", () => {
    expect(supabaseSrc).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(supabaseSrc).toContain("VITE_SUPABASE_ANON_KEY");
  });

  it("should_use_nullish_coalescing_for_key_fallback", () => {
    // Must use ?? not || to correctly handle empty string
    expect(supabaseSrc).toMatch(
      /VITE_SUPABASE_PUBLISHABLE_KEY.*\?\?[\s\S]*VITE_SUPABASE_ANON_KEY/
    );
  });

  it("should_log_console_error_with_missing_var_names", () => {
    expect(supabaseSrc).toContain("console.error");
    expect(supabaseSrc).toContain("[APEX OmniHub] Supabase is not configured");
  });

  it("should_reference_cloudflare_pages_in_console_error", () => {
    expect(supabaseSrc).toContain("Cloudflare Pages");
  });

  it("should_use_placeholder_url_when_config_missing", () => {
    expect(supabaseSrc).toContain("https://placeholder.supabase.co");
  });

  it("should_use_pkce_auth_flow", () => {
    expect(supabaseSrc).toContain("flowType: 'pkce'");
  });
});

// ─── REGRESSION: Login.tsx structural integrity ─────────────────────

describe("Login.tsx structural integrity (regression guard)", () => {
  const loginSrc = readFileSync(LOGIN_TSX, "utf-8");

  it("should_have_email_input_with_autocomplete", () => {
    expect(loginSrc).toContain('autoComplete="email"');
  });

  it("should_have_password_input_with_autocomplete", () => {
    expect(loginSrc).toContain('autoComplete="current-password"');
  });

  it("should_have_google_oauth_button", () => {
    expect(loginSrc).toContain("handleOAuthSignIn('google')");
  });

  it("should_have_apple_oauth_button", () => {
    expect(loginSrc).toContain("handleOAuthSignIn('apple')");
  });

  it("should_have_request_access_link", () => {
    expect(loginSrc).toContain('href="/request-access"');
  });

  it("should_validate_email_without_regex_dos_vulnerability", () => {
    // Must use indexOf-based validation, NOT regex
    expect(loginSrc).toContain("email.indexOf('@')");
    expect(loginSrc).toContain("email.lastIndexOf('@')");
    expect(loginSrc).toContain("email.lastIndexOf('.')");
  });

  it("should_enforce_minimum_password_length", () => {
    expect(loginSrc).toContain("password.length < 6");
  });

  it("should_enforce_max_email_length_of_254", () => {
    expect(loginSrc).toContain("MAX_EMAIL_LENGTH = 254");
  });

  it("should_export_LoginPage_function", () => {
    expect(loginSrc).toContain("export function LoginPage()");
  });

  it("should_have_noIndex_seo_meta_to_prevent_indexing", () => {
    expect(loginSrc).toContain("noIndex={true}");
  });
});
