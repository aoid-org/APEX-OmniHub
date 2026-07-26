/**
 * tests/signals/redundancy.test.ts
 *
 * Unit tests for src/signals/redundancy.ts.
 * Mocks child_process execFileSync and all fs calls used for the temp dir.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "node:path";

// Vitest mock for node:fs
const mockMkdtempSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock("node:fs", () => ({
  mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
}));

// Mock node:os tmpdir
vi.mock("node:os", () => ({
  tmpdir: () => "/tmp",
}));

// Mock child_process
const mockExecFileSync = vi.fn();
vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

import { collectRedundancy } from "../../src/signals/redundancy.js";

const SCAN_TARGETS = ["src"];
const REPO_ROOT = "/fake/repo";
const FAKE_TMP_DIR = "/tmp/arise-jscpd-abcdef";

describe("collectRedundancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdtempSync.mockReturnValue(FAKE_TMP_DIR);
  });

  function mockReport(percentage: number, duplicatedLines: number, clones: number) {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        statistics: { total: { percentage, duplicatedLines, clones } },
      }),
    );
    mockExecFileSync.mockReturnValue("");
  }

  it("returns score=1 when there is zero duplication", () => {
    mockReport(0, 0, 0);

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.name).toBe("redundancy");
    expect(result.score).toBe(1);
    expect(result.raw).toContain("0 duplicate block(s)");
    expect(result.raw).toContain("0.00%");
  });

  it("returns score=0.9 when duplication is 10%", () => {
    mockReport(10, 50, 3);

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBeCloseTo(0.9, 5);
  });

  it("clamps score to 0 when percentage is >= 100", () => {
    mockReport(100, 1000, 10);

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBe(0);
  });

  it("clamps score to 0 when percentage exceeds 100 (defensive)", () => {
    mockReport(120, 1200, 15);

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBe(0);
  });

  it("defaults to 0% duplication when statistics are missing", () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockReturnValue(JSON.stringify({}));

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBe(1);
  });

  it("always cleans up the temp directory even on success", () => {
    mockReport(5, 20, 2);

    collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(mockRmSync).toHaveBeenCalledWith(FAKE_TMP_DIR, { recursive: true, force: true });
  });

  it("cleans up the temp directory even when readFileSync throws", () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockImplementation(() => {
      throw new Error("file not found");
    });

    expect(() => collectRedundancy(SCAN_TARGETS, REPO_ROOT)).toThrow();
    expect(mockRmSync).toHaveBeenCalledWith(FAKE_TMP_DIR, { recursive: true, force: true });
  });

  it("throws a descriptive error when jscpd itself fails to run", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("jscpd binary not found");
    });

    expect(() => collectRedundancy(SCAN_TARGETS, REPO_ROOT)).toThrow(/jscpd failed to run/);
    // temp dir must still be cleaned up
    expect(mockRmSync).toHaveBeenCalledWith(FAKE_TMP_DIR, { recursive: true, force: true });
  });

  it("reads the report from the correct path inside the temp dir", () => {
    mockReport(0, 0, 0);

    collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    const readPath = (mockReadFileSync.mock.calls[0] as [string])[0];
    expect(readPath).toBe(path.join(FAKE_TMP_DIR, "jscpd-report.json"));
  });

  it("includes methodNote in the returned signal", () => {
    mockReport(0, 0, 0);

    const result = collectRedundancy(SCAN_TARGETS, REPO_ROOT);

    expect(result.methodNote).toContain("jscpd");
  });

  it("stringifies a non-Error thrown by execFileSync", () => {
    mockExecFileSync.mockImplementation(() => { throw "raw jscpd error"; });
    expect(() => collectRedundancy(SCAN_TARGETS, REPO_ROOT)).toThrow("raw jscpd error");
  });
});
