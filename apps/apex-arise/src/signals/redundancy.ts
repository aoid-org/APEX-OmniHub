import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SignalScore } from "../types.js";

const JSCPD_BIN = path.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "jscpd");
const CONFIG_PATH = path.join(import.meta.dirname, "..", "..", "config", ".jscpd.json");

interface JscpdReport {
  statistics?: {
    total?: {
      percentage?: number;
      duplicatedLines?: number;
      clones?: number;
    };
  };
}

export function collectRedundancy(scanTargets: string[], repoRoot: string): SignalScore {
  const outDir = mkdtempSync(path.join(tmpdir(), "arise-jscpd-"));
  try {
    try {
      execFileSync(
        JSCPD_BIN,
        ["--config", CONFIG_PATH, "--reporters", "json", "--output", outDir, ...scanTargets],
        { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 64 },
      );
    } catch (err) {
      // jscpd only exits non-zero when --threshold/--exit-code is set; neither is set here, so a
      // thrown error means jscpd genuinely failed to run, not that it found duplicates.
      throw new Error(`jscpd failed to run: ${err instanceof Error ? err.message : String(err)}`);
    }

    const report = JSON.parse(readFileSync(path.join(outDir, "jscpd-report.json"), "utf-8")) as JscpdReport;
    const stats = report.statistics?.total ?? {};
    const percentage = stats.percentage ?? 0;
    const duplicatedLines = stats.duplicatedLines ?? 0;
    const clones = stats.clones ?? 0;
    const score = Math.max(0, Math.min(1, 1 - percentage / 100));

    return {
      name: "redundancy",
      raw: `${clones} duplicate block(s) found, ${percentage.toFixed(2)}% of scanned lines duplicated (${duplicatedLines} lines)`,
      score,
      methodNote:
        "score = clamp(1 - duplicatedLinePercentage / 100, 0, 1), from jscpd totals against config/.jscpd.json (minTokens: 50, minLines: 5).",
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}
