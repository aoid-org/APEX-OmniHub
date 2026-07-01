import { REPO_ROOT, SCAN_TARGETS } from "./paths.js";
import { collectAcyclicity } from "./signals/acyclicity.js";
import { collectModularity } from "./signals/modularity.js";
import { collectRedundancy } from "./signals/redundancy.js";
import { collectStructural } from "./signals/structural.js";
import { computeComposite } from "./aggregate.js";
import { writeSnapshot } from "./snapshot.js";
import type { SignalScore } from "./types.js";

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function main(): void {
  const signals: SignalScore[] = [];
  const failures: { name: string; error: string }[] = [];

  const singleCollectors: { name: string; run: () => SignalScore }[] = [
    { name: "acyclicity", run: () => collectAcyclicity(SCAN_TARGETS, REPO_ROOT) },
    { name: "modularity", run: () => collectModularity(SCAN_TARGETS, REPO_ROOT) },
    { name: "redundancy", run: () => collectRedundancy(SCAN_TARGETS, REPO_ROOT) },
  ];

  for (const collector of singleCollectors) {
    try {
      signals.push(collector.run());
    } catch (err) {
      failures.push({ name: collector.name, error: toMessage(err) });
      console.error(`[arise] signal "${collector.name}" failed: ${toMessage(err)}`);
    }
  }

  try {
    const [depth, equality] = collectStructural(SCAN_TARGETS, REPO_ROOT);
    signals.push(depth, equality);
  } catch (err) {
    failures.push(
      { name: "depth", error: toMessage(err) },
      { name: "equality", error: toMessage(err) }
    );
    console.error(`[arise] structural signals (depth, equality) failed: ${toMessage(err)}`);
  }

  let composite: number | null = null;
  let compositeError: string | null = null;

  if (failures.length === 0) {
    try {
      const scoreMap = Object.fromEntries(signals.map((s) => [s.name, s.score])) as Partial<
        Record<SignalScore["name"], number>
      >;
      composite = computeComposite(scoreMap);
    } catch (err) {
      compositeError = toMessage(err);
      console.error(`[arise] composite calculation failed: ${compositeError}`);
    }
  } else {
    compositeError = `degraded run: signal(s) failed to produce a score: ${failures.map((f) => f.name).join(", ")}`;
  }

  const outPath = writeSnapshot({
    signals,
    composite,
    compositeError,
    failures,
    scanTargets: SCAN_TARGETS,
    timestamp: new Date().toISOString(),
  });

  console.error(`[arise] snapshot written to ${outPath}`);
  console.error(composite === null ? `[arise] degraded run: ${compositeError}` : `[arise] composite score: ${composite.toFixed(2)}`);

  // Phase 0 is measurement-only: never fail the build, regardless of scan outcome.
  process.exit(0);
}

main();
