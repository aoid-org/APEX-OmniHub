import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExecFileSync = vi.fn();
const mockMkdtempSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));
vi.mock("node:fs", () => ({
  mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
}));

function jscpdReport(duplicates: unknown[]): string {
  return JSON.stringify({ duplicates, statistics: {} });
}

describe("selectRedundancyTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockMkdtempSync.mockReturnValue("/tmp/arise-propose-jscpd-abc");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when jscpd finds no duplicates", async () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockReturnValue(jscpdReport([]));
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    expect(selectRedundancyTarget()).toBeNull();
    expect(mockRmSync).toHaveBeenCalledWith("/tmp/arise-propose-jscpd-abc", { recursive: true, force: true });
  });

  it("picks the largest duplicate block by line count", async () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      if (typeof filePath === "string" && filePath.endsWith("jscpd-report.json")) {
        return jscpdReport([
          {
            firstFile: { name: "/repo/src/a.ts", startLoc: { line: 10 }, endLoc: { line: 15 } },
            secondFile: { name: "/repo/src/b.ts", startLoc: { line: 20 }, endLoc: { line: 25 } },
            lines: 6,
            tokens: 40,
          },
          {
            firstFile: { name: "/repo/src/c.ts", startLoc: { line: 1 }, endLoc: { line: 20 } },
            secondFile: { name: "/repo/src/d.ts", startLoc: { line: 1 }, endLoc: { line: 20 } },
            lines: 20,
            tokens: 100,
          },
        ]);
      }
      return "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11\nline12\nline13\nline14\nline15\nline16\nline17\nline18\nline19\nline20";
    });
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    const target = selectRedundancyTarget();
    expect(target).not.toBeNull();
    expect(target?.clone.lines).toBe(20);
    expect(target?.clone.firstFile.startLine).toBe(1);
    expect(target?.clone.firstFile.endLine).toBe(20);
  });

  it("breaks ties by token count when line counts are equal", async () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      if (typeof filePath === "string" && filePath.endsWith("jscpd-report.json")) {
        return jscpdReport([
          {
            firstFile: { name: "/repo/src/a.ts", startLoc: { line: 1 }, endLoc: { line: 10 } },
            secondFile: { name: "/repo/src/b.ts", startLoc: { line: 1 }, endLoc: { line: 10 } },
            lines: 10,
            tokens: 40,
          },
          {
            firstFile: { name: "/repo/src/e.ts", startLoc: { line: 1 }, endLoc: { line: 10 } },
            secondFile: { name: "/repo/src/f.ts", startLoc: { line: 1 }, endLoc: { line: 10 } },
            lines: 10,
            tokens: 90,
          },
        ]);
      }
      return "x";
    });
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    const target = selectRedundancyTarget();
    expect(target?.clone.tokens).toBe(90);
  });

  it("returns empty fragment text when the source file can't be read", async () => {
    mockExecFileSync.mockReturnValue("");
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      if (typeof filePath === "string" && filePath.endsWith("jscpd-report.json")) {
        return jscpdReport([
          {
            firstFile: { name: "/repo/src/missing.ts", startLoc: { line: 1 }, endLoc: { line: 5 } },
            secondFile: { name: "/repo/src/also-missing.ts", startLoc: { line: 1 }, endLoc: { line: 5 } },
            lines: 5,
            tokens: 50,
          },
        ]);
      }
      throw new Error("ENOENT");
    });
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    const target = selectRedundancyTarget();
    expect(target?.firstFragment).toBe("");
    expect(target?.secondFragment).toBe("");
  });

  it("throws (does not swallow) when jscpd itself fails to run", async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("spawn ENOENT");
    });
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    expect(() => selectRedundancyTarget()).toThrow(/jscpd failed to run/);
    expect(mockRmSync).toHaveBeenCalled();
  });

  it("cleans up the temp output dir even when jscpd fails", async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("boom");
    });
    const { selectRedundancyTarget } = await import("../../src/propose/target.js");

    try {
      selectRedundancyTarget();
    } catch {
      // expected
    }
    expect(mockRmSync).toHaveBeenCalledWith("/tmp/arise-propose-jscpd-abc", { recursive: true, force: true });
  });
});
