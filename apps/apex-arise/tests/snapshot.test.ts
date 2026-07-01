/**
 * tests/snapshot.test.ts
 *
 * Tests for src/snapshot.ts — snapshot path/date formatting,
 * content rendering for normal and degraded runs, and fs-boundary mocking.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignalScore } from "../src/types.js";

// --- helpers -----------------------------------------------------------

function makeSignal(
  name: SignalScore["name"],
  score: number,
  raw: string,
  methodNote: string,
): SignalScore {
  return { name, score, raw, methodNote };
}

const FULL_SIGNALS: SignalScore[] = [
  makeSignal("acyclicity", 1.0, "no circular dependencies found", "score = 1/(1+cycleCount)"),
  makeSignal("modularity", 0.9, "1 rule violation(s) found", "score = 1/(1+violationCount)"),
  makeSignal("redundancy", 0.8, "2 duplicate block(s) found, 2.00% duplicated", "score = clamp(1 - pct/100, 0, 1)"),
  makeSignal("depth", 0.75, "max nesting depth 5 in src/x.ts; 1 file(s) exceed depth 4", "score = 1/(1+filesOverThreshold)"),
  makeSignal("equality", 0.5, "largest file src/y.ts (800 LOC); 1 file(s) exceed 600 LOC", "score = 1/(1+filesOverThreshold)"),
];

// Mock fs at module level
vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { mkdirSync, writeFileSync } from "node:fs";
import { writeSnapshot } from "../src/snapshot.js";

describe("writeSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a file path containing the date from the timestamp", () => {
    const outPath = writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.79,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    expect(outPath).toContain("2026_07_01");
    expect(outPath).toContain("CURRENT_ARISE_STRUCTURAL_BASELINE");
  });

  it("calls mkdirSync and writeFileSync exactly once", () => {
    writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.79,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    expect(mkdirSync).toHaveBeenCalledOnce();
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it("writes content containing the composite score on a normal run", () => {
    writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.79,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(content).toContain("0.79");
    expect(content).toContain("Composite Score");
  });

  it("writes FAILED rows for signals missing from the signals array on a degraded run", () => {
    writeSnapshot({
      signals: [FULL_SIGNALS[0]!], // only acyclicity
      composite: null,
      compositeError: "degraded run: signal(s) failed to produce a score: modularity",
      failures: [{ name: "modularity", error: "depcruiser not found" }],
      scanTargets: ["src", "apps/omnihub-site/src"],
      timestamp: "2026-07-01T12:00:00.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(content).toContain("FAILED");
    expect(content).toContain("depcruiser not found");
    expect(content).toContain("N/A");
    expect(content).toContain("degraded run");
  });

  it("includes all scan targets in the Scan Scope section", () => {
    const targets = ["src", "apps/omnihub-site/src", "packages/core/src"];
    writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.5,
      compositeError: null,
      failures: [],
      scanTargets: targets,
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    for (const t of targets) {
      expect(content).toContain(t);
    }
  });

  it("renders N/A composite line with compositeError text when composite is null", () => {
    writeSnapshot({
      signals: [],
      composite: null,
      compositeError: "all signals failed",
      failures: [
        { name: "acyclicity", error: "madge not found" },
        { name: "modularity", error: "depcruiser not found" },
      ],
      scanTargets: ["src"],
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(content).toContain("N/A — degraded run");
    expect(content).toContain("all signals failed");
  });

  it("renders signal rows with score and raw for all five signals", () => {
    writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.5,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-07-01T10:00:00.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(content).toContain("Acyclicity");
    expect(content).toContain("Modularity");
    expect(content).toContain("Redundancy");
    expect(content).toContain("Depth");
    expect(content).toContain("Equality");
  });

  it("formats the date as YYYY-MM-DD in the document heading", () => {
    writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.5,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-12-31T23:59:59.000Z",
    });

    const [, content] = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(content).toContain("2026-12-31");
  });

  it("formats the output filename as YYYY_MM_DD (underscores)", () => {
    const outPath = writeSnapshot({
      signals: FULL_SIGNALS,
      composite: 0.5,
      compositeError: null,
      failures: [],
      scanTargets: ["src"],
      timestamp: "2026-12-31T23:59:59.000Z",
    });

    expect(outPath).toContain("2026_12_31");
  });
});
