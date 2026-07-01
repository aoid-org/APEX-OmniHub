import { describe, expect, it } from "vitest";
import { validateEnvelope } from "../../src/propose/envelope.js";
import type { CandidateDiff, ProposePolicy } from "../../src/propose/types.js";

const POLICY: ProposePolicy = {
  tier1: { maxLinesChanged: 150, maxFilesChanged: 5 },
  hardBlockedAlways: [
    "supabase/functions/physiomni-action/**",
    "policy/rsi-policy.yaml",
    "policy/arise-policy.yaml",
    "apps/omnihub-site/dashboard/OmniDashShell.tsx",
    ".github/workflows/**",
  ],
};

function diff(overrides: Partial<CandidateDiff> = {}): CandidateDiff {
  return { filesTouched: ["src/foo.ts"], linesChanged: 10, patch: "diff", ...overrides };
}

describe("validateEnvelope", () => {
  it("allows a small diff touching ordinary files", () => {
    expect(validateEnvelope(diff(), POLICY)).toEqual({ allowed: true });
  });

  it("rejects a diff exceeding max_lines_changed", () => {
    const verdict = validateEnvelope(diff({ linesChanged: 151 }), POLICY);
    expect(verdict).toMatchObject({ allowed: false, reason: "TOO_MANY_LINES" });
  });

  it("allows a diff at exactly max_lines_changed (boundary)", () => {
    expect(validateEnvelope(diff({ linesChanged: 150 }), POLICY)).toEqual({ allowed: true });
  });

  it("rejects a diff exceeding max_files_changed", () => {
    const verdict = validateEnvelope(
      diff({ filesTouched: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"] }),
      POLICY,
    );
    expect(verdict).toMatchObject({ allowed: false, reason: "TOO_MANY_FILES" });
  });

  it("allows a diff at exactly max_files_changed (boundary)", () => {
    const verdict = validateEnvelope(diff({ filesTouched: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"] }), POLICY);
    expect(verdict).toEqual({ allowed: true });
  });

  it("rejects a diff touching an exact hard-blocked path", () => {
    const verdict = validateEnvelope(diff({ filesTouched: ["policy/rsi-policy.yaml"] }), POLICY);
    expect(verdict).toMatchObject({ allowed: false, reason: "HARD_BLOCKED_PATH" });
  });

  it("rejects a diff touching its own permission envelope (policy/arise-policy.yaml)", () => {
    const verdict = validateEnvelope(diff({ filesTouched: ["policy/arise-policy.yaml"] }), POLICY);
    expect(verdict).toMatchObject({ allowed: false, reason: "HARD_BLOCKED_PATH" });
  });

  it("rejects a diff touching a file under a '/**' hard-blocked prefix", () => {
    const verdict = validateEnvelope(
      diff({ filesTouched: ["supabase/functions/physiomni-action/index.ts"] }),
      POLICY,
    );
    expect(verdict).toMatchObject({ allowed: false, reason: "HARD_BLOCKED_PATH" });
  });

  it("does not match a '/**' prefix pattern against an unrelated sibling directory", () => {
    const verdict = validateEnvelope(
      diff({ filesTouched: ["supabase/functions/physiomni-action-other/index.ts"] }),
      POLICY,
    );
    expect(verdict).toEqual({ allowed: true });
  });

  it("checks hard-blocked paths before size limits (policy violation takes priority)", () => {
    const verdict = validateEnvelope(
      diff({ filesTouched: ["policy/rsi-policy.yaml"], linesChanged: 9999 }),
      POLICY,
    );
    expect(verdict).toMatchObject({ allowed: false, reason: "HARD_BLOCKED_PATH" });
  });

  it("rejects a diff touching OmniDashShell.tsx (exact hard-blocked file)", () => {
    const verdict = validateEnvelope(
      diff({ filesTouched: ["apps/omnihub-site/dashboard/OmniDashShell.tsx"] }),
      POLICY,
    );
    expect(verdict).toMatchObject({ allowed: false, reason: "HARD_BLOCKED_PATH" });
  });
});
