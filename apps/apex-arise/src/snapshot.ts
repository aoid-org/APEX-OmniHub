import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths.js";
import type { SignalScore } from "./types.js";

export interface SnapshotInput {
  signals: SignalScore[];
  composite: number | null;
  compositeError: string | null;
  failures: { name: string; error: string }[];
  scanTargets: string[];
  timestamp: string;
}

const SIGNAL_ORDER: SignalScore["name"][] = ["acyclicity", "modularity", "redundancy", "depth", "equality"];
const SIGNAL_LABEL: Record<SignalScore["name"], string> = {
  acyclicity: "Acyclicity",
  modularity: "Modularity",
  redundancy: "Redundancy",
  depth: "Depth",
  equality: "Equality",
};

export function writeSnapshot(input: SnapshotInput): string {
  const isoDate = input.timestamp.slice(0, 10);
  const fileDate = isoDate.replaceAll("-", "_");
  const outDir = path.join(REPO_ROOT, "memory/omni-recall/docs");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `CURRENT_ARISE_STRUCTURAL_BASELINE_${fileDate}.md`);

  const bySignal = new Map(input.signals.map((s) => [s.name, s]));

  const rows = SIGNAL_ORDER.map((name) => {
    const signal = bySignal.get(name);
    if (!signal) {
      const failure = input.failures.find((f) => f.name === name || f.name.includes(name));
      return `| ${SIGNAL_LABEL[name]} | N/A | FAILED: ${failure?.error ?? "unknown error"} |`;
    }
    return `| ${SIGNAL_LABEL[name]} | ${signal.score.toFixed(2)} | ${signal.raw} |`;
  }).join("\n");

  const compositeLine =
    input.composite === null
      ? `N/A — degraded run (${input.compositeError ?? (input.failures.map((f) => f.name).join(", ") || "unknown")})`
      : input.composite.toFixed(2);

  const methodology = SIGNAL_ORDER.map((name) => {
    const signal = bySignal.get(name);
    return signal ? `- **${SIGNAL_LABEL[name]}**: ${signal.methodNote}` : `- **${SIGNAL_LABEL[name]}**: not computed this run.`;
  }).join("\n");

  const content = `# A.R.I.S.E. Structural Baseline: ${isoDate}

Phase 0 (Structural Observatory). Measurement only. No code changes proposed.

## Composite Score: ${compositeLine}

| Signal | Score | Raw Finding |
|---|---|---|
${rows}

## Scan Scope

${input.scanTargets.map((t) => `- \`${t}\``).join("\n")}

## Methodology Note

${methodology}

## Next Action

This is a measurement snapshot. No autonomous action is taken on these findings in Phase 0.
`;

  writeFileSync(outPath, content, "utf-8");
  return outPath;
}
