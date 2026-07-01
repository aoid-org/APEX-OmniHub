import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelResult, ProposePolicy, ProposeTarget } from "../../src/propose/types.js";

const mockSelectRedundancyTarget = vi.fn();
const mockProposeFix = vi.fn();
const mockLoadProposePolicy = vi.fn();
const mockValidateEnvelope = vi.fn();
const mockRunSandboxCheck = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock("../../src/propose/target.js", () => ({
  selectRedundancyTarget: (...args: unknown[]) => mockSelectRedundancyTarget(...args),
}));
vi.mock("../../src/propose/model.js", () => ({
  proposeFix: (...args: unknown[]) => mockProposeFix(...args),
}));
vi.mock("../../src/propose/policy-loader.js", () => ({
  loadProposePolicy: (...args: unknown[]) => mockLoadProposePolicy(...args),
}));
vi.mock("../../src/propose/envelope.js", () => ({
  validateEnvelope: (...args: unknown[]) => mockValidateEnvelope(...args),
}));
vi.mock("../../src/propose/sandbox.js", () => ({
  runSandboxCheck: (...args: unknown[]) => mockRunSandboxCheck(...args),
}));
vi.mock("node:fs", () => ({
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

const TARGET: ProposeTarget = {
  signal: "redundancy",
  clone: {
    firstFile: { path: "src/a.ts", startLine: 1, endLine: 10 },
    secondFile: { path: "src/b.ts", startLine: 1, endLine: 10 },
    lines: 10,
    tokens: 50,
  },
  firstFragment: "x",
  secondFragment: "x",
};

const POLICY: ProposePolicy = {
  tier1: { maxLinesChanged: 150, maxFilesChanged: 5 },
  hardBlockedAlways: ["policy/arise-policy.yaml"],
};

const AVAILABLE_MODEL_RESULT: ModelResult = {
  available: true,
  error: null,
  proposedDiff: "--- a/src/a.ts\n+++ b/src/a.ts\n+const x = 1;\n",
  confidence: "high",
  rationale: "extracted a helper",
  filesTouched: ["src/a.ts", "src/b.ts"],
};

function findWriteCall(needle: string): [string, string] | undefined {
  return mockWriteFileSync.mock.calls.find((call) => String(call[0]).includes(needle)) as [string, string] | undefined;
}

describe("propose index orchestrator (main)", () => {
  let stubbedExit: ReturnType<typeof vi.fn>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_OUTPUT;

    stubbedExit = vi.fn();
    vi.stubGlobal("process", { ...process, exit: stubbedExit });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));

    mockLoadProposePolicy.mockReturnValue(POLICY);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports no_target and exits 0 when jscpd finds no duplicates", async () => {
    mockSelectRedundancyTarget.mockReturnValue(null);
    await import("../../src/propose/index.js");

    expect(mockProposeFix).not.toHaveBeenCalled();
    expect(stubbedExit).toHaveBeenCalledWith(0);
    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("## Outcome: No Target Found");
  });

  it("reports model_unavailable and exits 0 when the model fails closed", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue({ available: false, error: "NOT_CONFIGURED" });
    await import("../../src/propose/index.js");

    expect(stubbedExit).toHaveBeenCalledWith(0);
    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("## Outcome: Model Unavailable");
    expect(call?.[1]).toContain("NOT_CONFIGURED");
  });

  it("reports envelope_rejected (size cap) without flagging a policy violation, and never runs the sandbox", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockValidateEnvelope.mockReturnValue({ allowed: false, reason: "TOO_MANY_FILES", detail: "6 files, limit 5" });
    await import("../../src/propose/index.js");

    expect(mockRunSandboxCheck).not.toHaveBeenCalled();
    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("## Outcome: Envelope Rejected");
    expect(call?.[1]).not.toContain("POLICY VIOLATION");
  });

  it("reports envelope_rejected as a loud policy violation when a hard-blocked path is touched", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockValidateEnvelope.mockReturnValue({
      allowed: false,
      reason: "HARD_BLOCKED_PATH",
      detail: "touched policy/arise-policy.yaml",
    });
    await import("../../src/propose/index.js");

    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("POLICY VIOLATION");
  });

  it("reports sandbox_failed and exits 0 when the sandbox rejects the diff", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockValidateEnvelope.mockReturnValue({ allowed: true });
    mockRunSandboxCheck.mockResolvedValue({ passed: false, step: "lint", output: "eslint error" });
    await import("../../src/propose/index.js");

    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("## Outcome: Sandbox Tests Failed");
    expect(call?.[1]).toContain("eslint error");
  });

  it("writes candidate.patch and metadata.json and reports Patch Proposed on a full happy-path run", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockValidateEnvelope.mockReturnValue({ allowed: true });
    mockRunSandboxCheck.mockResolvedValue({ passed: true, step: null, output: "all good" });
    await import("../../src/propose/index.js");

    const patchCall = findWriteCall("candidate.patch");
    const metadataCall = findWriteCall("metadata.json");
    expect(patchCall).toBeDefined();
    expect(metadataCall).toBeDefined();
    expect(patchCall?.[1]).toBe(AVAILABLE_MODEL_RESULT.proposedDiff);

    const reportCall = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(reportCall?.[1]).toContain("## Outcome: Patch Proposed");
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("writes patch_ready=true to GITHUB_OUTPUT only on a successful proposal", async () => {
    process.env.GITHUB_OUTPUT = "/tmp/gh-output";
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockValidateEnvelope.mockReturnValue({ allowed: true });
    mockRunSandboxCheck.mockResolvedValue({ passed: true, step: null, output: "all good" });
    await import("../../src/propose/index.js");

    const outputCall = mockWriteFileSync.mock.calls.find((call) => call[0] === "/tmp/gh-output");
    expect(outputCall?.[1]).toBe("patch_ready=true\n");
  });

  it("writes patch_ready=false to GITHUB_OUTPUT on a rejection", async () => {
    process.env.GITHUB_OUTPUT = "/tmp/gh-output";
    mockSelectRedundancyTarget.mockReturnValue(null);
    await import("../../src/propose/index.js");

    const outputCall = mockWriteFileSync.mock.calls.find((call) => call[0] === "/tmp/gh-output");
    expect(outputCall?.[1]).toBe("patch_ready=false\n");
  });

  it("does not write to GITHUB_OUTPUT when the env var is unset (e.g. local runs)", async () => {
    mockSelectRedundancyTarget.mockReturnValue(null);
    await import("../../src/propose/index.js");

    const outputCall = mockWriteFileSync.mock.calls.find((call) => call[0] === "/tmp/gh-output");
    expect(outputCall).toBeUndefined();
  });

  it("catches an unexpected error (e.g. a broken policy file) and still exits 0 with a degraded report", async () => {
    mockSelectRedundancyTarget.mockReturnValue(TARGET);
    mockProposeFix.mockResolvedValue(AVAILABLE_MODEL_RESULT);
    mockLoadProposePolicy.mockImplementation(() => {
      throw new Error("policy file missing tier_1_propose");
    });
    await import("../../src/propose/index.js");

    expect(stubbedExit).toHaveBeenCalledWith(0);
    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[1]).toContain("## Outcome: Degraded Run (Unexpected Error)");
    expect(call?.[1]).toContain("policy file missing tier_1_propose");
  });

  it("writes the report to the correctly dated path", async () => {
    mockSelectRedundancyTarget.mockReturnValue(null);
    await import("../../src/propose/index.js");

    const call = findWriteCall("CURRENT_ARISE_PROPOSE_REPORT");
    expect(call?.[0]).toContain("CURRENT_ARISE_PROPOSE_REPORT_2026_07_01.md");
    expect(call?.[0]).toContain("memory/omni-recall/docs");
  });
});
