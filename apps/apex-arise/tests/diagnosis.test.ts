/**
 * tests/diagnosis.test.ts
 *
 * Tests for the Phase 1a Diagnosis Engine: src/diagnosis/ranker.ts,
 * src/diagnosis/reporter.ts, and the src/diagnosis/index.ts orchestrator.
 *
 * Strategy mirrors tests/index.test.ts and tests/snapshot.test.ts: mock all
 * Phase 0 signal collectors, node:fs, and process.exit so no real files are
 * written and no real CLI tools (madge/jscpd/dependency-cruiser/ts-morph) run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompositeResult, SignalScore } from "../src/types.js";
import { MissingSignalError, rankSignals } from "../src/diagnosis/ranker.js";
import { generateDegradedReport, generateDiagnosisReport } from "../src/diagnosis/reporter.js";

// --- fixtures ------------------------------------------------------------

function makeSignal(name: SignalScore["name"], score: number, raw: string, methodNote = `note for ${name}`): SignalScore {
  return { name, score, raw, methodNote };
}

const LIVE_SIGNALS: SignalScore[] = [
  makeSignal("acyclicity", 0.33, "2 circular dependency chain(s) found", "score = 1/(1+cycleCount)"),
  makeSignal("modularity", 1.0, "no rule violations found", "score = 1/(1+violationCount)"),
  makeSignal(
    "redundancy",
    0.99,
    "113 duplicate block(s) found, 1.42% of scanned lines duplicated (1130 lines)",
    "score = clamp(1 - duplicatedLinePercentage / 100, 0, 1)",
  ),
  makeSignal(
    "depth",
    0.2,
    "max nesting depth 10 in src/components/VoiceInterface.tsx; 4 file(s) exceed depth 4",
    "score = 1/(1+filesOverThreshold)",
  ),
  makeSignal(
    "equality",
    0.11,
    "largest file apps/omnihub-site/src/pages/Home.tsx (2456 LOC); 8 file(s) exceed 600 LOC across 480 files (avg 142 LOC)",
    "score = 1/(1+filesOverThreshold)",
  ),
];

function makeComposite(signals: SignalScore[]): CompositeResult {
  return {
    signals,
    composite: 0.37,
    timestamp: "2026-07-01T10:00:00.000Z",
    scanTargets: ["src", "apps/omnihub-site/src"],
  };
}

// --- ranker ----------------------------------------------------------------

describe("rankSignals", () => {
  it("returns all 5 signals sorted ascending by score", () => {
    const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
    expect(ranked).toHaveLength(5);
    const scores = ranked.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });

  it("sets rank 1 as the signal with the lowest score", () => {
    const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[0]!.name).toBe("equality");
    expect(ranked[1]!.rank).toBe(2);
    expect(ranked[1]!.name).toBe("depth");
  });

  it("sets isHotspot true for scores below 0.5", () => {
    const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
    const equality = ranked.find((r) => r.name === "equality")!;
    const depth = ranked.find((r) => r.name === "depth")!;
    const acyclicity = ranked.find((r) => r.name === "acyclicity")!;
    expect(equality.isHotspot).toBe(true);
    expect(depth.isHotspot).toBe(true);
    expect(acyclicity.isHotspot).toBe(true);
  });

  it("sets isHotspot false for scores at or above 0.5", () => {
    const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
    const modularity = ranked.find((r) => r.name === "modularity")!;
    const redundancy = ranked.find((r) => r.name === "redundancy")!;
    expect(modularity.isHotspot).toBe(false);
    expect(redundancy.isHotspot).toBe(false);
  });

  it("computes gap as 1 - score for every ranked signal", () => {
    const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
    for (const signal of ranked) {
      expect(signal.gap).toBeCloseTo(1 - signal.score, 10);
    }
  });

  it("throws a typed MissingSignalError (not a silent default) on a missing signal", () => {
    const missingEquality = LIVE_SIGNALS.filter((s) => s.name !== "equality");
    expect(() => rankSignals(makeComposite(missingEquality))).toThrow(MissingSignalError);
    expect(() => rankSignals(makeComposite(missingEquality))).toThrow(/equality/);
  });

  it("throws on a null score in any signal", () => {
    const withNullScore = LIVE_SIGNALS.map((s) =>
      s.name === "depth" ? ({ ...s, score: null } as unknown as SignalScore) : s,
    );
    expect(() => rankSignals(makeComposite(withNullScore))).toThrow(MissingSignalError);
    expect(() => rankSignals(makeComposite(withNullScore))).toThrow(/depth/);
  });

  it("throws on a NaN score in any signal", () => {
    const withNaNScore = LIVE_SIGNALS.map((s) =>
      s.name === "acyclicity" ? { ...s, score: Number.NaN } : s,
    );
    expect(() => rankSignals(makeComposite(withNaNScore))).toThrow(MissingSignalError);
  });
});

// --- reporter ----------------------------------------------------------------

describe("generateDiagnosisReport", () => {
  const ranked = rankSignals(makeComposite(LIVE_SIGNALS));
  const report = generateDiagnosisReport(ranked, "2026-07-01T10:00:00.000Z", 0.37);

  it("contains all 5 signal section headers", () => {
    expect(report).toContain("Acyclicity");
    expect(report).toContain("Modularity");
    expect(report).toContain("Redundancy");
    expect(report).toContain("Depth");
    expect(report).toContain("Equality");
  });

  it("places the lowest-scored signal (Equality) at the rank 1 position", () => {
    expect(report).toMatch(/### Rank 1 — Equality: 0\.11/);
  });

  it("places the second-lowest-scored signal (Depth) at the rank 2 position", () => {
    expect(report).toMatch(/### Rank 2 — Depth: 0\.20/);
  });

  it("marks hotspot signals with the HOTSPOT label", () => {
    expect(report).toMatch(/Rank 1 — Equality:[^\n]*HOTSPOT/);
    expect(report).toMatch(/Rank 2 — Depth:[^\n]*HOTSPOT/);
  });

  it("does not mark non-hotspot signals with the HOTSPOT label", () => {
    const modularityLine = report.split("\n").find((l) => l.includes("— Modularity:"));
    expect(modularityLine).toBeDefined();
    expect(modularityLine).not.toContain("HOTSPOT");
  });

  it("names Home.tsx as the artifact for the Equality signal", () => {
    expect(report).toContain("apps/omnihub-site/src/pages/Home.tsx");
  });

  it("names VoiceInterface.tsx as the artifact for the Depth signal", () => {
    expect(report).toContain("src/components/VoiceInterface.tsx");
  });

  it("includes the Phase 1b priority targets table", () => {
    expect(report).toContain("## Priority Targets for Phase 1b");
    expect(report).toContain("| Priority | File | Signal | Metric |");
    expect(report).toContain("apps/omnihub-site/src/pages/Home.tsx");
  });

  it("includes a Methodology section", () => {
    expect(report).toContain("## Methodology");
    expect(report).toContain("score = 1/(1+cycleCount)");
  });

  it("includes a Next Action section", () => {
    expect(report).toContain("## Next Action");
    expect(report).toContain("Phase 1a is diagnosis only");
  });

  it("includes the composite score and gap from perfect", () => {
    expect(report).toContain("## Composite Score: 0.37");
    expect(report).toContain("Gap from perfect: 0.63");
  });

  it("falls back to a repo-wide N/A artifact for signals with no single named file", () => {
    const acyclicitySection = report
      .split("### Rank")
      .find((section) => section.includes("Acyclicity:"));
    expect(acyclicitySection).toBeDefined();
    expect(acyclicitySection).toContain("N/A — signal is repo-wide");
  });

  it("handles an equality raw finding with no parseable file gracefully", () => {
    const unparseable = LIVE_SIGNALS.map((s) =>
      s.name === "equality" ? { ...s, raw: "no oversized files found" } : s,
    );
    const rankedUnparseable = rankSignals(makeComposite(unparseable));
    const reportUnparseable = generateDiagnosisReport(rankedUnparseable, "2026-07-01T10:00:00.000Z", 0.5);
    expect(reportUnparseable).toContain("N/A — signal is repo-wide (no oversized files found)");
  });

  it("handles a depth raw finding with no parseable file gracefully", () => {
    const unparseable = LIVE_SIGNALS.map((s) =>
      s.name === "depth" ? { ...s, raw: "no deep nesting found" } : s,
    );
    const rankedUnparseable = rankSignals(makeComposite(unparseable));
    const reportUnparseable = generateDiagnosisReport(rankedUnparseable, "2026-07-01T10:00:00.000Z", 0.5);
    expect(reportUnparseable).toContain("N/A — signal is repo-wide (no deep nesting found)");
  });

  it("omits the average-LOC suffix when the equality raw finding has no avg figure", () => {
    const noAvg = LIVE_SIGNALS.map((s) =>
      s.name === "equality" ? { ...s, raw: "largest file src/z.ts (900 LOC)" } : s,
    );
    const rankedNoAvg = rankSignals(makeComposite(noAvg));
    const reportNoAvg = generateDiagnosisReport(rankedNoAvg, "2026-07-01T10:00:00.000Z", 0.5);
    expect(reportNoAvg).toContain("`src/z.ts` — 900 LOC");
    expect(reportNoAvg).not.toContain("900 LOC (avg");
  });

  it("marks a signal absent from the ranked list as not computed in the Methodology section", () => {
    const partiallyRanked = rankSignals(makeComposite(LIVE_SIGNALS)).filter((r) => r.name !== "redundancy");
    const partialReport = generateDiagnosisReport(partiallyRanked, "2026-07-01T10:00:00.000Z", 0.5);
    expect(partialReport).toContain("**Redundancy**: not computed this run.");
  });
});

describe("generateDegradedReport", () => {
  it("contains a failure/degraded section in the body", () => {
    const report = generateDegradedReport(
      "degraded run: signal(s) failed to produce a score: acyclicity",
      "2026-07-01T10:00:00.000Z",
      LIVE_SIGNALS.filter((s) => s.name !== "acyclicity"),
      [{ name: "acyclicity", error: "madge not found" }],
    );
    expect(report).toContain("## Degraded Run");
    expect(report).toContain("madge not found");
    expect(report).toContain("### Signal failures");
  });

  it("lists collected signals even on a partial degraded run", () => {
    const report = generateDegradedReport(
      "degraded run",
      "2026-07-01T10:00:00.000Z",
      [LIVE_SIGNALS[0]!],
      [{ name: "modularity", error: "depcruiser not found" }],
    );
    expect(report).toContain("Acyclicity");
  });

  it("handles a fully degraded run with zero collected signals", () => {
    const report = generateDegradedReport(
      "all signals failed",
      "2026-07-01T10:00:00.000Z",
      [],
      [{ name: "acyclicity", error: "madge not found" }],
    );
    expect(report).toContain("no signals collected this run");
  });
});

// --- index orchestrator ------------------------------------------------------

const mockCollectAcyclicity = vi.fn();
const mockCollectModularity = vi.fn();
const mockCollectRedundancy = vi.fn();
const mockCollectStructural = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock("../src/signals/acyclicity.js", () => ({
  collectAcyclicity: (...args: unknown[]) => mockCollectAcyclicity(...args),
}));
vi.mock("../src/signals/modularity.js", () => ({
  collectModularity: (...args: unknown[]) => mockCollectModularity(...args),
}));
vi.mock("../src/signals/redundancy.js", () => ({
  collectRedundancy: (...args: unknown[]) => mockCollectRedundancy(...args),
}));
vi.mock("../src/signals/structural.js", () => ({
  collectStructural: (...args: unknown[]) => mockCollectStructural(...args),
}));
vi.mock("node:fs", () => ({
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

function setupHappyPath() {
  mockCollectAcyclicity.mockReturnValue(LIVE_SIGNALS[0]);
  mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
  mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
  mockCollectStructural.mockReturnValue([LIVE_SIGNALS[3], LIVE_SIGNALS[4]]);
}

describe("diagnosis index orchestrator (main)", () => {
  let stubbedExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    stubbedExit = vi.fn();
    vi.stubGlobal("process", { ...process, exit: stubbedExit });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("writes the report to the correctly dated path on a full run", async () => {
    setupHappyPath();
    await import("../src/diagnosis/index.js");

    expect(mockMkdirSync).toHaveBeenCalledOnce();
    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    const [outPath] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(outPath).toContain("CURRENT_ARISE_DIAGNOSIS_REPORT_2026_07_01.md");
    expect(outPath).toContain("memory/omni-recall/docs");
  });

  it("exits 0 on a fully successful run", async () => {
    setupHappyPath();
    await import("../src/diagnosis/index.js");
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("writes a ranked, non-degraded report on a fully successful run", async () => {
    setupHappyPath();
    await import("../src/diagnosis/index.js");
    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(content).toContain("Rank 1 — Equality");
    expect(content).not.toContain("## Degraded Run");
  });

  it("exits 0 even when a signal collector fails (degraded run)", async () => {
    mockCollectAcyclicity.mockImplementation(() => {
      throw new Error("madge not found");
    });
    mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
    mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
    mockCollectStructural.mockReturnValue([LIVE_SIGNALS[3], LIVE_SIGNALS[4]]);

    await import("../src/diagnosis/index.js");

    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("produces a report containing a degraded section when a signal collector fails", async () => {
    mockCollectAcyclicity.mockImplementation(() => {
      throw new Error("madge not found");
    });
    mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
    mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
    mockCollectStructural.mockReturnValue([LIVE_SIGNALS[3], LIVE_SIGNALS[4]]);

    await import("../src/diagnosis/index.js");

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(content).toContain("## Degraded Run");
    expect(content).toContain("madge not found");
  });

  it("produces a degraded report if ranking fails downstream despite all collectors succeeding", async () => {
    // Simulate a corrupted signal (NaN score) slipping through collection.
    mockCollectAcyclicity.mockReturnValue({ ...LIVE_SIGNALS[0], score: Number.NaN });
    mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
    mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
    mockCollectStructural.mockReturnValue([LIVE_SIGNALS[3], LIVE_SIGNALS[4]]);

    await import("../src/diagnosis/index.js");

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(content).toContain("## Degraded Run");
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("stringifies a non-Error thrown value from a collector instead of crashing", async () => {
    mockCollectAcyclicity.mockImplementation(() => {
      throw "raw string failure";
    });
    mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
    mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
    mockCollectStructural.mockReturnValue([LIVE_SIGNALS[3], LIVE_SIGNALS[4]]);

    await import("../src/diagnosis/index.js");

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(content).toContain("raw string failure");
  });

  it("records both depth and equality failures when collectStructural throws", async () => {
    mockCollectAcyclicity.mockReturnValue(LIVE_SIGNALS[0]);
    mockCollectModularity.mockReturnValue(LIVE_SIGNALS[1]);
    mockCollectRedundancy.mockReturnValue(LIVE_SIGNALS[2]);
    mockCollectStructural.mockImplementation(() => {
      throw new Error("ts-morph project initialization failed");
    });

    await import("../src/diagnosis/index.js");

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    expect(content).toContain("depth");
    expect(content).toContain("equality");
    expect(content).toContain("ts-morph project initialization failed");
  });
});
