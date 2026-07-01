import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import type { SignalScore } from "../types.js";

const require = createRequire(import.meta.url);
const madgeConfig = require("../../config/madge.config.cjs") as { extensions: string; excludeRegExp: string };
const MADGE_BIN = path.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "madge");

export function collectAcyclicity(scanTargets: string[], repoRoot: string): SignalScore {
  const tsConfig = path.join(repoRoot, "tsconfig.app.json");

  let stdout: string;
  try {
    stdout = execFileSync(
      MADGE_BIN,
      [
        "--circular",
        "--json",
        "--extensions",
        madgeConfig.extensions,
        "--ts-config",
        tsConfig,
        "--exclude",
        madgeConfig.excludeRegExp,
        ...scanTargets,
      ],
      { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 64 },
    );
  } catch (err) {
    // madge exits 1 when circular dependencies are found, but still writes the JSON payload to stdout.
    const stdoutFromError = (err as { stdout?: string }).stdout;
    if (stdoutFromError) {
      stdout = stdoutFromError;
    } else {
      throw new Error(`madge failed to run: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const cycles = JSON.parse(stdout) as string[][];
  const cycleCount = cycles.length;
  const score = 1 / (1 + cycleCount);

  return {
    name: "acyclicity",
    raw: cycleCount === 0 ? "no circular dependencies found" : `${cycleCount} circular dependency chain(s) found`,
    score,
    methodNote: "score = 1 / (1 + cycleCount), from `madge --circular --json` across scan targets.",
  };
}
