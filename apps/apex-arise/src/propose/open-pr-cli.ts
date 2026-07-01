import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../paths.js";
import { openProposalPr } from "./pr.js";
import type { ModelProposal } from "./types.js";

const ARTIFACT_DIR = path.join(REPO_ROOT, "apps/apex-arise/artifacts/propose");

interface CandidateMetadata {
  branchName: string;
  filesTouched: string[];
  confidence: ModelProposal["confidence"];
  rationale: string;
}

/**
 * CLI entrypoint for the arise-propose.yml workflow's `open-pr` job only.
 * Reads the validated-diff artifact the `propose` job uploaded (patch +
 * metadata), then hands it to pr.ts. This file only ever runs in the job
 * carrying a write-scoped, PR-creation-only token — never the job that ran
 * the model call or the sandbox.
 */
async function main(): Promise<void> {
  const patch = readFileSync(path.join(ARTIFACT_DIR, "candidate.patch"), "utf-8");
  const metadata = JSON.parse(readFileSync(path.join(ARTIFACT_DIR, "metadata.json"), "utf-8")) as CandidateMetadata;

  const proposal: ModelProposal = {
    proposedDiff: patch,
    confidence: metadata.confidence,
    rationale: metadata.rationale,
    filesTouched: metadata.filesTouched,
  };

  const result = await openProposalPr({
    diff: { patch, filesTouched: metadata.filesTouched, linesChanged: 0 },
    proposal,
    branchName: metadata.branchName,
  });

  if (!result.opened) {
    console.error(`[arise-open-pr] failed to open PR: ${result.error}`);
    process.exit(0); // fail closed — never break the build over a PR-creation failure
  }

  console.error(`[arise-open-pr] PR opened: ${result.url}`);
  process.exit(0);
}

main();
