import type { SignalScore } from "./types.js";

const SIGNAL_NAMES: SignalScore["name"][] = ["acyclicity", "modularity", "redundancy", "depth", "equality"];

export function computeComposite(scores: Partial<Record<SignalScore["name"], number>>): number {
  const values = SIGNAL_NAMES.map((name) => {
    const value = scores[name];
    if (value === undefined || value === null || Number.isNaN(value)) {
      throw new Error(`Composite calculation failed: signal "${name}" did not produce a score.`);
    }
    if (value < 0 || value > 1) {
      throw new Error(`Composite calculation failed: signal "${name}" produced an out-of-range score (${value}). Expected [0,1].`);
    }
    return value;
  });

  const product = values.reduce((acc, value) => acc * value, 1);
  return Math.pow(product, 1 / values.length);
}
