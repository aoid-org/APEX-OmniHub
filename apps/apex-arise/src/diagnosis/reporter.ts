import type { SignalScore } from "../types.js";
import type { RankedSignal } from "./ranker.js";

const SIGNAL_LABEL: Record<SignalScore["name"], string> = {
  acyclicity: "Acyclicity",
  modularity: "Modularity",
  redundancy: "Redundancy",
  depth: "Depth",
  equality: "Equality",
};

const SIGNAL_ORDER: SignalScore["name"][] = [
  "acyclicity",
  "modularity",
  "redundancy",
  "depth",
  "equality",
];

const STRUCTURAL_RISK: Record<SignalScore["name"], string> = {
  equality:
    "Oversized files concentrate unrelated responsibilities, which raises merge-conflict surface and makes change impact hard to reason about.",
  depth:
    "Deeply nested control flow raises cyclomatic complexity, making edge cases and race conditions easier to miss during review.",
  acyclicity:
    "Circular dependency chains create tight coupling that risks load-order bugs and makes isolated testing or safe refactors difficult.",
  redundancy:
    "Duplicated logic drifts out of sync across copies, so bug fixes applied to one copy silently fail to reach the others.",
  modularity:
    "Dependency-cruiser rule violations signal that architectural boundaries are not being enforced, risking uncontrolled coupling growth.",
};

interface ExtractedArtifact {
  file: string | null;
  metric: string;
}

function extractEqualityArtifact(raw: string): ExtractedArtifact {
  const fileMatch = /largest file (\S+) \((\d+) LOC\)/.exec(raw);
  if (!fileMatch) {
    return { file: null, metric: raw };
  }
  const avgMatch = /avg (\d+) LOC/.exec(raw);
  const loc = fileMatch[2];
  const metric = avgMatch ? `${loc} LOC (avg ${avgMatch[1]})` : `${loc} LOC`;
  return { file: fileMatch[1]!, metric };
}

function extractDepthArtifact(raw: string): ExtractedArtifact {
  const match = /max nesting depth (\d+) in ([^;]+);/.exec(raw);
  if (!match) {
    return { file: null, metric: raw };
  }
  return { file: match[2]!.trim(), metric: `nesting depth ${match[1]}` };
}

function extractArtifact(signal: Pick<RankedSignal, "name" | "rawFinding">): ExtractedArtifact {
  switch (signal.name) {
    case "equality":
      return extractEqualityArtifact(signal.rawFinding);
    case "depth":
      return extractDepthArtifact(signal.rawFinding);
    default:
      return { file: null, metric: signal.rawFinding };
  }
}

function formatNamedArtifact(signal: RankedSignal): string {
  const { file, metric } = extractArtifact(signal);
  return file ? `\`${file}\` — ${metric}` : `N/A — signal is repo-wide (${metric})`;
}

function formatSignalSection(signal: RankedSignal): string {
  const label = SIGNAL_LABEL[signal.name];
  const hotspotSuffix = signal.isHotspot ? " — HOTSPOT" : "";
  return `### Rank ${signal.rank} — ${label}: ${signal.score.toFixed(2)} (gap: ${signal.gap.toFixed(2)})${hotspotSuffix}
**Raw finding:** ${signal.rawFinding}
**Named artifact:** ${formatNamedArtifact(signal)}
**Structural risk:** ${STRUCTURAL_RISK[signal.name]}`;
}

function formatPriorityTable(ranked: RankedSignal[]): string {
  const rows = ranked
    .slice(0, 2)
    .map((signal, index) => {
      const { file, metric } = extractArtifact(signal);
      return `| ${index + 1} | ${file ?? "N/A"} | ${SIGNAL_LABEL[signal.name]} | ${metric} |`;
    })
    .join("\n");
  return `| Priority | File | Signal | Metric |\n|---|---|---|---|\n${rows}`;
}

function formatMethodology(ranked: RankedSignal[]): string {
  const byName = new Map(ranked.map((s) => [s.name, s]));
  return SIGNAL_ORDER.map((name) => {
    const signal = byName.get(name);
    return signal ? `- **${SIGNAL_LABEL[name]}**: ${signal.methodNote}` : `- **${SIGNAL_LABEL[name]}**: not computed this run.`;
  }).join("\n");
}

/** Renders the Phase 1a diagnosis report from a fully ranked, non-degraded run. */
export function generateDiagnosisReport(ranked: RankedSignal[], timestamp: string, composite: number): string {
  const isoDate = timestamp.slice(0, 10);
  const gapFromPerfect = (1 - composite).toFixed(2);

  const sections = ranked.map(formatSignalSection).join("\n\n");

  return `# A.R.I.S.E. Diagnosis Report: ${isoDate}

Phase 1a (Diagnosis Engine). Read-only analysis. No code changes proposed.

## Composite Score: ${composite.toFixed(2)}
Phase 0 baseline: 0.37 | Gap from perfect: ${gapFromPerfect}

## Signal Ranking (worst first)

${sections}

## Priority Targets for Phase 1b

${formatPriorityTable(ranked)}

## Methodology

${formatMethodology(ranked)}

## Next Action

Phase 1a is diagnosis only. No autonomous action taken.
Findings are inputs for Phase 1b scoping.
Phase 1b requires a separate, explicitly-scoped contract.
`;
}

/** Renders a degraded-run report when one or more signals failed to collect or rank. */
export function generateDegradedReport(
  reason: string,
  timestamp: string,
  signals: SignalScore[],
  failures: { name: string; error: string }[],
): string {
  const isoDate = timestamp.slice(0, 10);

  const failureLines =
    failures.length > 0
      ? failures.map((f) => `- **${f.name}**: ${f.error}`).join("\n")
      : "- (no individual collector failures recorded; ranking/report generation failed downstream)";

  const collectedLines =
    signals.length > 0
      ? signals.map((s) => `- **${SIGNAL_LABEL[s.name]}**: ${s.score.toFixed(2)} — ${s.raw}`).join("\n")
      : "- (no signals collected this run)";

  return `# A.R.I.S.E. Diagnosis Report: ${isoDate}

Phase 1a (Diagnosis Engine). Read-only analysis. No code changes proposed.

## Degraded Run

This run did not produce a complete ranked diagnosis: ${reason}

### Signals collected

${collectedLines}

### Signal failures

${failureLines}

## Methodology

Ranking and priority targeting require all five signals to be present. This run
is reported degraded rather than silently substituting a default score.

## Next Action

Phase 1a is diagnosis only. No autonomous action taken.
Re-run \`bun run arise:diagnose\` once the failing collector(s) are fixed to
produce a complete ranked diagnosis.
`;
}
