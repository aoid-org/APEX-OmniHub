/**
 * tests/signals/acyclicity.test.ts
 *
 * Unit tests for src/signals/acyclicity.ts.
 * Mocks child_process execFileSync and the madge config require.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the madge config CJS require — must happen before importing the module
vi.mock("../../config/madge.config.cjs", () => ({
  default: { extensions: "ts,tsx", excludeRegExp: "node_modules" },
  extensions: "ts,tsx",
  excludeRegExp: "node_modules",
}));

// Mock child_process
const mockExecFileSync = vi.fn();
vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

// We must also mock createRequire so the module-level require() does not fail
vi.mock("node:module", () => ({
  createRequire: () => () => ({ extensions: "ts,tsx", excludeRegExp: "node_modules" }),
}));

import { collectAcyclicity } from "../../src/signals/acyclicity.js";

const SCAN_TARGETS = ["src"];
const REPO_ROOT = "/fake/repo";

describe("collectAcyclicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns score=1 when there are no circular dependencies", () => {
    mockExecFileSync.mockReturnValue("[]");

    const result = collectAcyclicity(SCAN_TARGETS, REPO_ROOT);

    expect(result.name).toBe("acyclicity");
    expect(result.score).toBe(1);
    expect(result.raw).toContain("no circular dependencies");
  });

  it("returns score=0.5 when there is exactly 1 cycle", () => {
    // madge exits 1 with cycles but still outputs JSON to stdout
    const error = new Error("Command failed") as Error & { stdout: string };
    error.stdout = JSON.stringify([["a.ts", "b.ts"]]);
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = collectAcyclicity(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBeCloseTo(0.5, 5);
    expect(result.raw).toContain("1 circular dependency chain(s)");
  });

  it("returns score=1/4 when there are 3 cycles", () => {
    const error = new Error("Command failed") as Error & { stdout: string };
    error.stdout = JSON.stringify([
      ["a.ts", "b.ts"],
      ["c.ts", "d.ts"],
      ["e.ts", "a.ts"],
    ]);
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = collectAcyclicity(SCAN_TARGETS, REPO_ROOT);

    expect(result.score).toBeCloseTo(1 / 4, 5);
    expect(result.raw).toContain("3 circular dependency chain(s)");
  });

  it("throws when madge fails without any stdout output", () => {
    const error = new Error("madge binary not found") as Error & { stdout?: string };
    // no stdout property
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    expect(() => collectAcyclicity(SCAN_TARGETS, REPO_ROOT)).toThrow(/madge failed to run/);
  });

  it("includes methodNote in the returned signal", () => {
    mockExecFileSync.mockReturnValue("[]");

    const result = collectAcyclicity(SCAN_TARGETS, REPO_ROOT);

    expect(result.methodNote).toContain("madge");
  });

  it("passes repoRoot as cwd to execFileSync", () => {
    mockExecFileSync.mockReturnValue("[]");

    collectAcyclicity(SCAN_TARGETS, REPO_ROOT);

    const callArgs = mockExecFileSync.mock.calls[0];
    const opts = callArgs[2] as { cwd: string };
    expect(opts.cwd).toBe(REPO_ROOT);
  });
});
