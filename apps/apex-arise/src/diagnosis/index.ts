import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, SCAN_TARGETS } from "../paths.js";
import { collectAcyclicity } from "../signals/acyclicity.js";
import { collectModularity } from "../signals/modularity.js";
import { collectRedundancy } from "../signals/redundancy.js";
import { collectStructural } from "../signals/structural.js";
import { computeComposite } from "../aggregate.js";
import { rankSignals } from "./ranker.js";
import { generateDegradedReport, generateDiagnosisReport } from "./reporter.js";
import type { CompositeResult, SignalScore } from "../types.js";

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface Phase0Collection {
  signals: SignalScore[];
  failures: { name: string; error: string }[];
}

/**
 * Re-runs the same Phase 0 collectors wired in src/index.ts (imported directly,
 * not via that module, since src/index.ts calls process.exit(0) as a load-time
 * side effect). No collector logic is duplicated here.
 */
function collectPhase0Signals(): Phase0Collection {
  const signals: SignalScore[] = [];
  const failures: { name: string; error: string }[] = [];

  const record = (names: readonly SignalScore["name"][], collect: () => SignalScore[]): void => {
    try {
      signals.push(...collect());
    } catch (err) {
      const message = toMessage(err);
      failures.push(...names.map((name) => ({ name, error: message })));
      console.error(`[arise-diagnosis] signal(s) "${names.join(", ")}" failed: ${message}`);
    }
  };

  record(["acyclicity"], () => [collectAcyclicity(SCAN_TARGETS, REPO_ROOT)]);
  record(["modularity"], () => [collectModularity(SCAN_TARGETS, REPO_ROOT)]);
  record(["redundancy"], () => [collectRedundancy(SCAN_TARGETS, REPO_ROOT)]);
  record(["depth", "equality"], () => collectStructural(SCAN_TARGETS, REPO_ROOT));

  return { signals, failures };
}

function writeDiagnosisReport(content: string, timestamp: string): string {
  const fileDate = timestamp.slice(0, 10).replaceAll("-", "_");
  const outPath = path.join(REPO_ROOT, "memory/omni-recall/docs", `CURRENT_ARISE_DIAGNOSIS_REPORT_${fileDate}.md`);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
  return outPath;
}

export function main(): void {
  const timestamp = new Date().toISOString();
  const { signals, failures } = collectPhase0Signals();

  let content: string;

  if (failures.length === 0) {
    try {
      const scoreMap = Object.fromEntries(signals.map((s) => [s.name, s.score])) as Partial<
        Record<SignalScore["name"], number>
      >;
      const composite = computeComposite(scoreMap);
      const compositeResult: CompositeResult = { signals, composite, timestamp, scanTargets: SCAN_TARGETS };
      const ranked = rankSignals(compositeResult);
      content = generateDiagnosisReport(ranked, timestamp, composite);
    } catch (err) {
      // Same degraded-run pattern as Phase 0's src/index.ts: log to the report, never throw.
      content = generateDegradedReport(toMessage(err), timestamp, signals, failures);
      console.error(`[arise-diagnosis] degraded run: ${toMessage(err)}`);
    }
  } else {
    const reason = `degraded run: signal(s) failed to produce a score: ${failures.map((f) => f.name).join(", ")}`;
    content = generateDegradedReport(reason, timestamp, signals, failures);
    console.error(`[arise-diagnosis] ${reason}`);
  }

  const outPath = writeDiagnosisReport(content, timestamp);
  console.error(`[arise-diagnosis] report written to ${outPath}`);

  // Phase 1a is diagnosis-only: never fail the build, regardless of scan outcome.
  process.exit(0);
}

main();
