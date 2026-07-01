import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { REPO_ROOT, SCAN_TARGETS } from "../paths.js";
import type { ProposeTarget, RedundancyClone } from "./types.js";

const JSCPD_BIN = path.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "jscpd");
const CONFIG_PATH = path.join(import.meta.dirname, "..", "..", "config", ".jscpd.json");

interface JscpdFileRef {
  name: string;
  startLoc: { line: number };
  endLoc: { line: number };
}

interface JscpdDuplicate {
  firstFile: JscpdFileRef;
  secondFile: JscpdFileRef;
  lines: number;
  tokens: number;
}

interface JscpdReport {
  duplicates?: JscpdDuplicate[];
}

function readFragment(absolutePath: string, startLine: number, endLine: number): string {
  try {
    const lines = readFileSync(absolutePath, "utf-8").split("\n");
    return lines.slice(startLine - 1, endLine).join("\n");
  } catch {
    return "";
  }
}

function toClone(duplicate: JscpdDuplicate): RedundancyClone {
  return {
    firstFile: {
      path: path.relative(REPO_ROOT, duplicate.firstFile.name),
      startLine: duplicate.firstFile.startLoc.line,
      endLine: duplicate.firstFile.endLoc.line,
    },
    secondFile: {
      path: path.relative(REPO_ROOT, duplicate.secondFile.name),
      startLine: duplicate.secondFile.startLoc.line,
      endLine: duplicate.secondFile.endLoc.line,
    },
    lines: duplicate.lines,
    tokens: duplicate.tokens,
  };
}

/**
 * Re-runs jscpd (same binary/config as src/signals/redundancy.ts) to get the
 * concrete clone list the diagnosis report's aggregate redundancy score
 * doesn't carry. Picks the single largest duplicate block (by line count,
 * then token count) as the Phase 1b pilot target, per the execution
 * contract's recommendation: duplication removal is a mechanically bounded,
 * test-verifiable diff shape, the right complexity to validate the pipeline.
 */
export function selectRedundancyTarget(): ProposeTarget | null {
  const outDir = mkdtempSync(path.join(tmpdir(), "arise-propose-jscpd-"));
  try {
    try {
      execFileSync(
        JSCPD_BIN,
        ["--config", CONFIG_PATH, "--reporters", "json", "--absolute", "--output", outDir, ...SCAN_TARGETS],
        { cwd: REPO_ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 64 },
      );
    } catch (err) {
      throw new Error(`jscpd failed to run: ${err instanceof Error ? err.message : String(err)}`);
    }

    const report = JSON.parse(readFileSync(path.join(outDir, "jscpd-report.json"), "utf-8")) as JscpdReport;
    const duplicates = report.duplicates ?? [];
    if (duplicates.length === 0) return null;

    const largest = duplicates.reduce((best, current) =>
      current.lines > best.lines || (current.lines === best.lines && current.tokens > best.tokens) ? current : best,
    );

    const clone = toClone(largest);

    return {
      signal: "redundancy",
      clone,
      firstFragment: readFragment(largest.firstFile.name, clone.firstFile.startLine, clone.firstFile.endLine),
      secondFragment: readFragment(largest.secondFile.name, clone.secondFile.startLine, clone.secondFile.endLine),
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}
