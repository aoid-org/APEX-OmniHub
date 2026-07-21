import { describe, expect, it } from "vitest";
import { generateProposeReport } from "../../src/propose/reporter.js";
import type { CandidateDiff, ModelProposal, ProposeOutcome } from "../../src/propose/types.js";

const TIMESTAMP = "2026-07-01T10:00:00.000Z";

const DIFF: CandidateDiff = {
  filesTouched: ["src/foo.ts", "src/bar.ts"],
  linesChanged: 42,
  patch: "diff --git a/src/foo.ts b/src/foo.ts",
};

const PROPOSAL: ModelProposal = {
  proposedDiff: DIFF.patch,
  confidence: "high",
  rationale: "Extracted a shared helper to remove the duplicated validation block.",
  filesTouched: DIFF.filesTouched,
};

describe("generateProposeReport", () => {
  it("renders the model_unavailable outcome with the error code", () => {
    const report = generateProposeReport({ kind: "model_unavailable", error: "NOT_CONFIGURED" }, TIMESTAMP);
    expect(report).toContain("## Outcome: Model Unavailable");
    expect(report).toContain("NOT_CONFIGURED");
  });

  it("renders the no_target outcome with the reason", () => {
    const outcome: ProposeOutcome = { kind: "no_target", reason: "jscpd found no duplicate blocks." };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("## Outcome: No Target Found");
    expect(report).toContain("jscpd found no duplicate blocks.");
  });

  it("renders a normal envelope rejection without flagging a policy violation", () => {
    const outcome: ProposeOutcome = {
      kind: "envelope_rejected",
      reason: "TOO_MANY_LINES",
      detail: "200 lines changed, limit is 150",
      policyViolation: false,
    };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("## Outcome: Envelope Rejected");
    expect(report).toContain("200 lines changed, limit is 150");
    expect(report).not.toContain("POLICY VIOLATION");
  });

  it("renders a hard-blocked-path envelope rejection with a loud POLICY VIOLATION marker", () => {
    const outcome: ProposeOutcome = {
      kind: "envelope_rejected",
      reason: "HARD_BLOCKED_PATH",
      detail: "policy/arise-policy.yaml matches hard_blocked_always pattern \"policy/arise-policy.yaml\"",
      policyViolation: true,
    };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("**POLICY VIOLATION**");
  });

  it("renders a sandbox_failed outcome with the failed step and truncated output", () => {
    const outcome: ProposeOutcome = { kind: "sandbox_failed", step: "typecheck", output: "error TS2322: ...".repeat(1) };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("## Outcome: Sandbox Tests Failed");
    expect(report).toContain("**Failed step:** typecheck");
    expect(report).toContain("error TS2322");
  });

  it("truncates very long sandbox output to avoid an unbounded report", () => {
    const hugeOutput = "x".repeat(10_000);
    const outcome: ProposeOutcome = { kind: "sandbox_failed", step: "test", output: hugeOutput };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report.length).toBeLessThan(hugeOutput.length);
  });

  it("renders an unexpected_error outcome", () => {
    const outcome: ProposeOutcome = { kind: "unexpected_error", error: "policy file missing tier_1_propose" };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("## Outcome: Degraded Run (Unexpected Error)");
    expect(report).toContain("policy file missing tier_1_propose");
  });

  it("renders a proposed outcome with confidence, files touched, branch, and rationale", () => {
    const outcome: ProposeOutcome = {
      kind: "proposed",
      diff: DIFF,
      proposal: PROPOSAL,
      branchName: "arise/propose-redundancy-20260701-abc123",
    };
    const report = generateProposeReport(outcome, TIMESTAMP);
    expect(report).toContain("## Outcome: Patch Proposed");
    expect(report).toContain("**Confidence:** high");
    expect(report).toContain("src/foo.ts, src/bar.ts");
    expect(report).toContain("arise/propose-redundancy-20260701-abc123");
    expect(report).toContain("Extracted a shared helper");
    expect(report).toContain("auto_merge: false");
  });

  it("always includes the Phase 1b header with the ISO date", () => {
    const report = generateProposeReport({ kind: "no_target", reason: "x" }, TIMESTAMP);
    expect(report).toContain("# A.R.I.S.E. Propose Report: 2026-07-01");
    expect(report).toContain("Phase 1b (Propose Engine)");
  });

  it("falls back to unknown when outcome.step is null", async () => {
    const { generateProposeReport } = await import("../../src/propose/reporter.js");
    const report = generateProposeReport(
      { kind: "sandbox_failed", step: null as unknown as string, output: "failed" },
      TIMESTAMP,
    );
    expect(report).toContain("**Failed step:** unknown");
  });
});
