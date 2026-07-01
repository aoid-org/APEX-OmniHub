export interface SignalScore {
  name: "acyclicity" | "modularity" | "redundancy" | "depth" | "equality";
  raw: string;
  score: number;
  methodNote: string;
}

export interface CompositeResult {
  signals: SignalScore[];
  composite: number;
  timestamp: string;
  scanTargets: string[];
}

export interface DegradedSignal {
  name: SignalScore["name"];
  error: string;
}
