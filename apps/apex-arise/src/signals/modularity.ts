import { execFileSync } from "node:child_process";
import path from "node:path";
import type { SignalScore } from "../types.js";

const DEPCRUISE_BIN = path.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "depcruise");
const CONFIG_PATH = path.join(import.meta.dirname, "..", "..", "config", ".dependency-cruiser.cjs");

export function collectModularity(scanTargets: string[], repoRoot: string): SignalScore {
  const targets = [...scanTargets, "apps/apex-arise"];

  let stdout: string;
  try {
    stdout = execFileSync(
      DEPCRUISE_BIN,
      ["--config", CONFIG_PATH, "--output-type", "json", ...targets],
      { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 64 },
    );
  } catch (err) {
    // dependency-cruiser exits non-zero when error-severity violations are found, but still writes JSON to stdout.
    const stdoutFromError = (err as { stdout?: string }).stdout;
    if (stdoutFromError) {
      stdout = stdoutFromError;
    } else {
      throw new Error(`dependency-cruiser failed to run: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const report = JSON.parse(stdout) as { summary?: { error?: number } };
  const violationCount = report.summary?.error ?? 0;
  const score = 1 / (1 + violationCount);

  return {
    name: "modularity",
    raw: violationCount === 0 ? "no rule violations found" : `${violationCount} rule violation(s) found`,
    score,
    methodNote:
      "score = 1 / (1 + violationCount), from dependency-cruiser error-severity violations against config/.dependency-cruiser.cjs.",
  };
}
