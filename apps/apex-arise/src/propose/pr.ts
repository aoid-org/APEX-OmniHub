import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { REPO_ROOT } from "../paths.js";
import type { CandidateDiff, ModelProposal } from "./types.js";

export const PR_TITLE = "A.R.I.S.E. Phase 1b — automated proposal, requires human review";

export interface OpenPrParams {
  diff: CandidateDiff;
  proposal: ModelProposal;
  branchName: string;
  baseBranch?: string;
}

export interface OpenPrResult {
  opened: boolean;
  url?: string;
  error?: string;
}

export function buildPrBody(proposal: ModelProposal, diff: CandidateDiff): string {
  return `**A.R.I.S.E. Phase 1b — automated proposal, requires human review**

This pull request was opened automatically by the A.R.I.S.E. Phase 1b propose
engine. It is bounded by \`tier_1_propose\` in \`policy/arise-policy.yaml\`
(at most 150 lines changed, at most 5 files touched) and requires human
review to merge — \`auto_merge\` is disabled by policy and this workflow
never merges pull requests.

**Confidence:** ${proposal.confidence}
**Files touched:** ${diff.filesTouched.join(", ")}

**Rationale:**
${proposal.rationale}
`;
}

function runGit(args: string[], cwd: string): void {
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * Opens a PR via the GitHub REST API. Only ever runs in the CI job that
 * holds a write-scoped token for PR creation — never the job that ran the
 * model call or the sandbox. Never merges, never force-pushes: there is no
 * merge call in this file, and every push below is a plain `git push`.
 */
export async function openProposalPr(params: OpenPrParams): Promise<OpenPrResult> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    return { opened: false, error: "GITHUB_TOKEN or GITHUB_REPOSITORY not configured" };
  }

  const baseBranch = params.baseBranch ?? "main";
  const patchFile = path.join(tmpdir(), `arise-pr-${Date.now()}-${Math.random().toString(36).slice(2)}.patch`);

  try {
    runGit(["config", "user.name", "github-actions[bot]"], REPO_ROOT);
    runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], REPO_ROOT);
    runGit(["checkout", "-b", params.branchName], REPO_ROOT);

    writeFileSync(patchFile, params.diff.patch, "utf-8");
    runGit(["apply", "--whitespace=nowarn", patchFile], REPO_ROOT);
    runGit(["add", "-A"], REPO_ROOT);
    runGit(["commit", "-m", PR_TITLE], REPO_ROOT);
    runGit(["push", "-u", "origin", params.branchName], REPO_ROOT);

    const response = await fetch(`https://api.github.com/repos/${repository}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: PR_TITLE,
        head: params.branchName,
        base: baseBranch,
        body: buildPrBody(params.proposal, params.diff),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { opened: false, error: `GitHub API error ${response.status}: ${text.slice(0, 500)}` };
    }

    const data = (await response.json()) as { html_url?: string };
    return { opened: true, url: data.html_url };
  } catch (err) {
    return { opened: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    rmSync(patchFile, { force: true });
  }
}
