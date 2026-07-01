import type { CompositeResult, SignalScore } from "../types.js";

export interface RankedSignal {
  rank: number;
  name: SignalScore["name"];
  score: number;
  gap: number;
  rawFinding: string;
  isHotspot: boolean;
  methodNote: string;
}

const EXPECTED_SIGNALS: SignalScore["name"][] = [
  "acyclicity",
  "modularity",
  "redundancy",
  "depth",
  "equality",
];

const HOTSPOT_THRESHOLD = 0.5;

export class MissingSignalError extends Error {
  constructor(name: string) {
    super(`Diagnosis ranking failed: signal "${name}" is missing or has a null/invalid score.`);
    this.name = "MissingSignalError";
  }
}

/**
 * Ranks the five Phase 0 signals worst-first (lowest score = rank 1).
 * Fails loudly on any missing or invalid score rather than substituting a default,
 * mirroring the fail-loud contract of aggregate.ts's computeComposite.
 */
export function rankSignals(result: CompositeResult): RankedSignal[] {
  const bySignal = new Map(result.signals.map((s) => [s.name, s]));

  for (const name of EXPECTED_SIGNALS) {
    const signal = bySignal.get(name);
    if (!signal) {
      throw new MissingSignalError(name);
    }
    if (signal.score === null || signal.score === undefined || Number.isNaN(signal.score)) {
      throw new MissingSignalError(name);
    }
  }

  const sorted = [...result.signals].sort((a, b) => a.score - b.score);

  return sorted.map((signal, index) => ({
    rank: index + 1,
    name: signal.name,
    score: signal.score,
    gap: 1 - signal.score,
    rawFinding: signal.raw,
    isHotspot: signal.score < HOTSPOT_THRESHOLD,
    methodNote: signal.methodNote,
  }));
}
