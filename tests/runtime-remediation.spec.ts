import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("runtime remediation source gates", () => {
  it("triggerModuleAction sends module_action payload without client user_id", () => {
    const source = readFileSync(
      "apps/omnihub-site/src/hooks/useOmniModuleState.ts",
      "utf8"
    );
    const fn = source.slice(
      source.indexOf("export async function triggerModuleAction")
    );
    expect(fn).toContain('kind: "module_action"');
    expect(fn).toContain("crypto.randomUUID()");
    expect(fn).not.toContain("user_id:");
  });

  it("trigger-workflow requires wrapper auth and branch-validates module actions before goal payload rejection", () => {
    const source = readFileSync(
      "supabase/functions/trigger-workflow/index.ts",
      "utf8"
    );
    expect(source).toContain("requireAuth: true");
    expect(source).not.toContain("authenticateUser(req)");
    expect(source.indexOf('rawBody.kind === "module_action"')).toBeLessThan(
      source.indexOf("validateGoalPayload(ctx.body)")
    );
    expect(source).toContain(
      "Client-supplied user_id or tenant_id is not accepted"
    );
    expect(source).toContain('status: "queued"');
  });

  it("public onboarding generation is origin, size, input, and rate limited before Anthropic", () => {
    const source = readFileSync(
      "supabase/functions/generate-business-skills/index.ts",
      "utf8"
    );
    expect(source).toContain("MAX_BODY_SIZE_BYTES");
    expect(source).toContain("!isOriginAllowed(origin)");
    expect(source).toContain(
      "description.length < 20 || description.length > 2000"
    );
    expect(source).toContain("goal.length < 5 || goal.length > 500");
    expect(source).toContain("RATE_LIMIT_CONFIGS.publicOnboardingGenerate");
    expect(source.indexOf("checkRateLimit")).toBeLessThan(
      source.indexOf('fetch("https://api.anthropic.com/v1/messages"')
    );
    expect(source).not.toContain("using fallback generation");
  });

  it("execute-automation scopes reads and timestamp updates to authenticated user and blocks unsafe tables", () => {
    const source = readFileSync(
      "supabase/functions/execute-automation/index.ts",
      "utf8"
    );
    const normalizedSource = source.replace(/\r\n/g, '\n');
    expect(normalizedSource).toContain(
      '.eq("id", automationId)\n      .eq("user_id", user.id)'
    );
    // Note: The file has it twice, so checking once is fine, or we can check match count, but previous test checked toContain twice which is redundant.
    const matchCount = (normalizedSource.match(/\.eq\("id", automationId\)\n {6}\.eq\("user_id", user\.id\)/g) || []).length;
    expect(matchCount).toBe(2);
    expect(source).not.toContain("'users',");
    expect(source).not.toContain("'audit_logs',");
    expect(source).toContain("Record owner mismatch");
    expect(source).toContain("assertUrlSafe");
  });

  it("Armageddon CI evidence is sim-only and uploaded by CI", () => {
    const script = readFileSync("src/scripts/certify-armageddon-ci.ts", "utf8");
    const workflow = readFileSync(
      ".github/workflows/ci-runtime-gates.yml",
      "utf8"
    );
    expect(script).toContain('SIM_MODE !== "true"');
    expect(script).toContain('mode: "ci-sim"');
    expect(script).toContain("temporalUsed: false");
    expect(script).toContain("supabaseTelemetryUsed: false");
    expect(workflow).toContain("bun run armageddon:certify:ci");
    expect(workflow).toContain("artifacts/armageddon/latest.json");
    expect(workflow).toContain("bun run secret:scan");
  });
});
