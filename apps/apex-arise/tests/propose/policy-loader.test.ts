import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReadFileSync = vi.fn();

vi.mock("node:fs", () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

const VALID_POLICY = `policy_version: 0.2.0
phase: 1
writes_permitted:
  - apps/apex-arise/**
tier_1_propose:
  max_lines_changed: 150
  max_files_changed: 5
  output: pull_request_only
hard_blocked_always:
  - supabase/functions/physiomni-action/**
  - policy/rsi-policy.yaml
  - policy/arise-policy.yaml
note: >
  some trailing note
`;

describe("loadProposePolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses tier_1_propose limits and hard_blocked_always from a well-formed policy file", async () => {
    mockReadFileSync.mockReturnValue(VALID_POLICY);
    const { loadProposePolicy } = await import("../../src/propose/policy-loader.js");

    const policy = loadProposePolicy();
    expect(policy.tier1).toEqual({ maxLinesChanged: 150, maxFilesChanged: 5 });
    expect(policy.hardBlockedAlways).toContain("policy/arise-policy.yaml");
    expect(policy.hardBlockedAlways).toContain("supabase/functions/physiomni-action/**");
  });

  it("throws PolicyLoadError if the file cannot be read", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });
    const { loadProposePolicy, PolicyLoadError } = await import("../../src/propose/policy-loader.js");

    expect(() => loadProposePolicy()).toThrow(PolicyLoadError);
  });

  it("throws PolicyLoadError if tier_1_propose is missing", async () => {
    const noTier = VALID_POLICY.replace(/tier_1_propose:[\s\S]*?output: pull_request_only\n/, "");
    mockReadFileSync.mockReturnValue(noTier);
    const { loadProposePolicy, PolicyLoadError } = await import("../../src/propose/policy-loader.js");

    expect(() => loadProposePolicy()).toThrow(PolicyLoadError);
    expect(() => loadProposePolicy()).toThrow(/tier_1_propose/);
  });

  it("throws PolicyLoadError if hard_blocked_always is empty", async () => {
    const noBlocked = VALID_POLICY.replace(/hard_blocked_always:[\s\S]*?note:/, "hard_blocked_always: []\nnote:");
    mockReadFileSync.mockReturnValue(noBlocked);
    const { loadProposePolicy, PolicyLoadError } = await import("../../src/propose/policy-loader.js");

    expect(() => loadProposePolicy()).toThrow(PolicyLoadError);
    expect(() => loadProposePolicy()).toThrow(/hard_blocked_always/);
  });

  it("strips inline YAML comments from hard_blocked_always entries", async () => {
    const withComment = VALID_POLICY.replace(
      "- supabase/functions/physiomni-action/**",
      "- supabase/functions/physiomni-action/**            # except its own arise.yml",
    );
    mockReadFileSync.mockReturnValue(withComment);
    const { loadProposePolicy } = await import("../../src/propose/policy-loader.js");

    const policy = loadProposePolicy();
    expect(policy.hardBlockedAlways).toContain("supabase/functions/physiomni-action/**");
    expect(policy.hardBlockedAlways.some((p) => p.includes("#"))).toBe(false);
  });
});

describe("loadProposePolicy edge fields", () => {
  it("throws when one tier_1_propose numeric field is missing", async () => {
    mockReadFileSync.mockReturnValue(VALID_POLICY.replace(/\s{2}max_files_changed: 5\n/, ""));
    const { loadProposePolicy, PolicyLoadError } = await import("../../src/propose/policy-loader.js");

    expect(() => loadProposePolicy()).toThrow(PolicyLoadError);
  });
});
