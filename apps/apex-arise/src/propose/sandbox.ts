import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { REPO_ROOT } from "../paths.js";
import type { CandidateDiff, SandboxResult } from "./types.js";

interface RunResult {
  ok: boolean;
  output: string;
}

function run(cmd: string, args: string[], cwd: string): RunResult {
  try {
    const output = execFileSync(cmd, args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 64,
    });
    return { ok: true, output };
  } catch (err) {
    const asExecError = err as { stdout?: string; stderr?: string };
    const output =
      asExecError.stdout !== undefined || asExecError.stderr !== undefined
        ? `${asExecError.stdout ?? ""}${asExecError.stderr ?? ""}`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, output };
  }
}

const CHECK_STEPS: { name: NonNullable<SandboxResult["step"]>; args: string[] }[] = [
  { name: "typecheck", args: ["run", "typecheck"] },
  { name: "lint", args: ["run", "lint"] },
  { name: "test", args: ["run", "test"] },
];

/**
 * Validates a candidate diff by applying it in an isolated git worktree and
 * running the repo's own typecheck/lint/test gates there — never against the
 * main checkout. GitHub Actions runners are already ephemeral per-job VMs;
 * the worktree isolates the working tree within that VM, no Docker/VM
 * dependency needed.
 *
 * node_modules is symlinked from the main checkout rather than reinstalled:
 * tier_1_propose caps diffs at 150 lines / 5 files, far too small to ever
 * change a dependency, so a full reinstall would only add latency.
 */
export async function runSandboxCheck(diff: CandidateDiff): Promise<SandboxResult> {
  const worktreePath = mkdtempSync(path.join(tmpdir(), "arise-propose-sandbox-"));
  rmSync(worktreePath, { recursive: true, force: true }); // git worktree add creates the dir itself

  try {
    const addResult = run("git", ["worktree", "add", "--detach", worktreePath, "HEAD"], REPO_ROOT);
    if (!addResult.ok) {
      return { passed: false, step: "apply", output: `git worktree add failed: ${addResult.output}` };
    }

    try {
      const patchFile = path.join(tmpdir(), `arise-propose-${Date.now()}-${Math.random().toString(36).slice(2)}.patch`);
      writeFileSync(patchFile, diff.patch, "utf-8");
      try {
        const applyResult = run("git", ["apply", "--whitespace=nowarn", patchFile], worktreePath);
        if (!applyResult.ok) {
          return { passed: false, step: "apply", output: applyResult.output };
        }
      } finally {
        rmSync(patchFile, { force: true });
      }

      symlinkSync(path.join(REPO_ROOT, "node_modules"), path.join(worktreePath, "node_modules"), "dir");

      for (const step of CHECK_STEPS) {
        const result = run("npm", step.args, worktreePath);
        if (!result.ok) {
          return { passed: false, step: step.name, output: result.output };
        }
      }

      return { passed: true, step: null, output: "typecheck, lint, and test all passed in the sandbox worktree." };
    } finally {
      run("git", ["worktree", "remove", "--force", worktreePath], REPO_ROOT);
    }
  } finally {
    rmSync(worktreePath, { recursive: true, force: true });
  }
}
