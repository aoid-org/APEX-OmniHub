/**
 * tests/signals/modularity.test.ts
 *
 * Unit tests for src/signals/modularity.ts.
 * Mocks child_process execFileSync.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockExecFileSync = vi.fn();
vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

import { collectModularity } from "../../src/signals/modularity.js";

const SCAN_TARGETS = ["src", "apps/omnihub-site/src"];
const REPO_ROOT = "/fake/repo";

describe("collectModularity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns score=1 when there are no error-severity violations", () => {
    mockExecFileSync.mockReturnValue(
      JSON.stringify({ summary: { error: 0 } }),
    );

    const result = collectModularity(SCAN_TARGETS, REPO_ROOT);

    expect(result.name).toBe("modularity");
    expect(result.score).toBe(1);
    expect(result.raw).toContain("no rule violations");
  });

  it("returns score=0.5 when there is exactly 1 violation", () => {
    const error = new Error("depcruise error") as Error & { stdout: string };
    error.stdout = JSON.stringify({ summary: { error: 1 } });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = collectModularity(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBeCloseTo(0.5, 5);
    expect(result.raw).toContain("1 rule violation(s)");
  });

  it("returns score=1/(1+N) for N violations", () => {
    const error = new Error("depcruise violations") as Error & { stdout: string };
    error.stdout = JSON.stringify({ summary: { error: 9 } });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = collectModularity(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBeCloseTo(1 / 10, 5);
  });

  it("defaults violationCount to 0 when summary.error is missing", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({}));

    const result = collectModularity(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBe(1);
  });

  it("throws when dependency-cruiser fails without stdout", () => {
    const error = new Error("binary not found") as Error & { stdout?: string };
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => collectModularity(SCAN_TARGETS, REPO_ROOT)).toThrow(
      /dependency-cruiser failed to run/,
    );
  });

  it("adds apex-arise to the targets list it passes to depcruiser", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({ summary: { error: 0 } }));

    collectModularity(SCAN_TARGETS, REPO_ROOT);

    const cliArgs = mockExecFileSync.mock.calls[0][1] as string[];
    expect(cliArgs).toContain("apps/apex-arise");
  });

  it("includes methodNote in the returned signal", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify({ summary: { error: 0 } }));

    const result = collectModularity(SCAN_TARGETS, REPO_ROOT);

    expect(result.methodNote).toContain("dependency-cruiser");
  });

  it("stringifies a non-Error thrown by execFileSync", () => {
    mockExecFileSync.mockImplementation(() => { throw "raw dp error"; });
    expect(() => collectModularity(SCAN_TARGETS, REPO_ROOT)).toThrow("raw dp error");
  });
});
