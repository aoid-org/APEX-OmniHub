import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../paths.js";
import { countChangedLines, makeBranchName } from "./diff-stats.js";
import { validateEnvelope } from "./envelope.js";
import { proposeFix } from "./model.js";
import { loadProposePolicy } from "./policy-loader.js";
import { generateProposeReport } from "./reporter.js";
import { runSandboxCheck } from "./sandbox.js";
import { selectRedundancyTarget } from "./target.js";
import type { CandidateDiff, ProposeOutcome } from "./types.js";

const ARTIFACT_DIR = path.join(REPO_ROOT, "apps/apex-arise/artifacts/propose");

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function writeProposeReport(content: string, timestamp: string): string {
  const fileDate = timestamp.slice(0, 10).replaceAll("-", "_");
  const outPath = path.join(REPO_ROOT, "memory/omni-recall/docs", `CURRENT_ARISE_PROPOSE_REPORT_${fileDate}.md`);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
  return outPath;
}

/** Sets a GH Actions step output if running inside a step that declared one; a silent no-op otherwise (e.g. local runs). */
function writeGithubOutput(name: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  writeFileSync(outputPath, `${name}=${value}\n`, { flag: "a" });
}

function writeCandidateArtifact(diff: CandidateDiff, branchName: string, confidence: string, rationale: string): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path.join(ARTIFACT_DIR, "candidate.patch"), diff.patch, "utf-8");
  writeFileSync(
    path.join(ARTIFACT_DIR, "metadata.json"),
    JSON.stringify({ branchName, filesTouched: diff.filesTouched, confidence, rationale }, null, 2),
    "utf-8",
  );
}

/**
 * Orchestrates one Phase 1b propose run: read the redundancy signal's
 * concrete findings -> ask the model for a bounded diff -> validate it
 * against the envelope -> verify it in an isolated sandbox -> hand the
 * validated diff to the open-pr CI job via an artifact. Any failure at any
 * step returns a typed outcome instead of throwing; main() always logs it
 * via reporter.ts and exits 0, never fails the build.
 */
export async function runProposeAttempt(): Promise<ProposeOutcome> {
  const target = selectRedundancyTarget();
  if (!target) {
    return { kind: "no_target", reason: "jscpd found no duplicate blocks in the current scan targets." };
  }

  const modelResult = await proposeFix(target);
  if (!modelResult.available) {
    return { kind: "model_unavailable", error: modelResult.error };
  }

  const diff: CandidateDiff = {
    filesTouched: modelResult.filesTouched,
    linesChanged: countChangedLines(modelResult.proposedDiff),
    patch: modelResult.proposedDiff,
  };

  const policy = loadProposePolicy();
  const verdict = validateEnvelope(diff, policy);
  if (!verdict.allowed) {
    return {
      kind: "envelope_rejected",
      reason: verdict.reason,
      detail: verdict.detail,
      policyViolation: verdict.reason === "HARD_BLOCKED_PATH",
    };
  }

  const sandboxResult = await runSandboxCheck(diff);
  if (!sandboxResult.passed) {
    return { kind: "sandbox_failed", step: sandboxResult.step, output: sandboxResult.output };
  }

  const branchName = makeBranchName(new Date().toISOString());
  writeCandidateArtifact(diff, branchName, modelResult.confidence, modelResult.rationale);

  return {
    kind: "proposed",
    diff,
    proposal: {
      proposedDiff: modelResult.proposedDiff,
      confidence: modelResult.confidence,
      rationale: modelResult.rationale,
      filesTouched: modelResult.filesTouched,
    },
    branchName,
  };
}

export async function main(): Promise<void> {
  const timestamp = new Date().toISOString();
  let outcome: ProposeOutcome;
  try {
    outcome = await runProposeAttempt();
  } catch (err) {
    outcome = { kind: "unexpected_error", error: toMessage(err) };
    console.error(`[arise-propose] unexpected error: ${toMessage(err)}`);
  }

  const content = generateProposeReport(outcome, timestamp);
  const outPath = writeProposeReport(content, timestamp);
  console.error(`[arise-propose] report written to ${outPath} (outcome=${outcome.kind})`);

  writeGithubOutput("patch_ready", outcome.kind === "proposed" ? "true" : "false");

  // Phase 1b is PR-only, never autonomous: exit 0 regardless of outcome,
  // same as Phase 0/1a. A rejection or failure is a valid, logged result,
  // not a build failure.
  process.exit(0);
}

main();
