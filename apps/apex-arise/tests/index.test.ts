/**
 * tests/index.test.ts
 *
 * Tests for the orchestration logic in src/index.ts.
 *
 * Strategy: mock all signal collectors, computeComposite, writeSnapshot,
 * and process.exit. We use vi.mock for all external modules and then
 * dynamically import index.ts for each test using vi.resetModules() to
 * get a fresh execution of main().
 *
 * process.exit is mocked via vi.stubGlobal so that process.exit(0) in
 * main() does not terminate the test runner.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignalScore } from "../src/types.js";

// ----- Static mocks for all signal/orchestration dependencies -----

const mockCollectAcyclicity = vi.fn();
const mockCollectModularity = vi.fn();
const mockCollectRedundancy = vi.fn();
const mockCollectStructural = vi.fn();
const mockComputeComposite = vi.fn();
const mockWriteSnapshot = vi.fn();

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
vi.mock("../src/aggregate.js", () => ({
  computeComposite: (...args: unknown[]) => mockComputeComposite(...args),
}));
vi.mock("../src/snapshot.js", () => ({
  writeSnapshot: (...args: unknown[]) => mockWriteSnapshot(...args),
}));

// ----- Helpers -----------------------------------------------------------

function makeSignal(name: SignalScore["name"]): SignalScore {
  return { name, score: 1.0, raw: `${name} ok`, methodNote: `note for ${name}` };
}

function setupHappyPath() {
  mockCollectAcyclicity.mockReturnValue(makeSignal("acyclicity"));
  mockCollectModularity.mockReturnValue(makeSignal("modularity"));
  mockCollectRedundancy.mockReturnValue(makeSignal("redundancy"));
  mockCollectStructural.mockReturnValue([makeSignal("depth"), makeSignal("equality")]);
  mockComputeComposite.mockReturnValue(1.0);
  mockWriteSnapshot.mockReturnValue("/fake/path/snapshot.md");
}

// ----- Tests -------------------------------------------------------------

describe("index orchestrator (main)", () => {
  // Stub process.exit BEFORE each test so the import of index.ts (which calls main())
  // does not terminate the test runner. vi.stubGlobal replaces process.exit on the
  // global object, which is what node code resolves.
  let stubbedExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    stubbedExit = vi.fn();
    vi.stubGlobal("process", { ...process, exit: stubbedExit });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls all four signal collectors on a fully successful run", async () => {
    setupHappyPath();
    await import("../src/index.js");

    expect(mockCollectAcyclicity).toHaveBeenCalledOnce();
    expect(mockCollectModularity).toHaveBeenCalledOnce();
    expect(mockCollectRedundancy).toHaveBeenCalledOnce();
    expect(mockCollectStructural).toHaveBeenCalledOnce();
  });

  it("calls writeSnapshot exactly once on a fully successful run", async () => {
    setupHappyPath();
    await import("../src/index.js");

    expect(mockWriteSnapshot).toHaveBeenCalledOnce();
  });

  it("always exits with code 0 (Phase 0 measurement-only, never fails the build)", async () => {
    setupHappyPath();
    await import("../src/index.js");

    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("passes a non-null composite score to writeSnapshot on a fully successful run", async () => {
    setupHappyPath();
    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      composite: number | null;
    };
    expect(snapshotInput.composite).toBe(1.0);
  });

  it("records a failure and produces a degraded snapshot when acyclicity collector throws", async () => {
    mockCollectAcyclicity.mockImplementation(() => {
      throw new Error("madge not found");
    });
    mockCollectModularity.mockReturnValue(makeSignal("modularity"));
    mockCollectRedundancy.mockReturnValue(makeSignal("redundancy"));
    mockCollectStructural.mockReturnValue([makeSignal("depth"), makeSignal("equality")]);
    mockWriteSnapshot.mockReturnValue("/fake/path/snapshot.md");

    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      composite: number | null;
      compositeError: string | null;
      failures: { name: string; error: string }[];
    };
    expect(snapshotInput.composite).toBeNull();
    expect(snapshotInput.compositeError).toContain("degraded run");
    expect(snapshotInput.failures.some((f) => f.name === "acyclicity")).toBe(true);
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("records both depth and equality failures when collectStructural throws", async () => {
    mockCollectAcyclicity.mockReturnValue(makeSignal("acyclicity"));
    mockCollectModularity.mockReturnValue(makeSignal("modularity"));
    mockCollectRedundancy.mockReturnValue(makeSignal("redundancy"));
    mockCollectStructural.mockImplementation(() => {
      throw new Error("ts-morph project initialization failed");
    });
    mockWriteSnapshot.mockReturnValue("/fake/path/snapshot.md");

    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      failures: { name: string; error: string }[];
    };
    const failNames = snapshotInput.failures.map((f) => f.name);
    expect(failNames).toContain("depth");
    expect(failNames).toContain("equality");
  });

  it("passes compositeError when computeComposite throws despite successful signal collection", async () => {
    setupHappyPath();
    mockComputeComposite.mockImplementation(() => {
      throw new Error('signal "equality" produced an out-of-range score');
    });

    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      composite: number | null;
      compositeError: string | null;
    };
    expect(snapshotInput.composite).toBeNull();
    expect(snapshotInput.compositeError).toContain("out-of-range");
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("passes a valid ISO 8601 timestamp to writeSnapshot", async () => {
    setupHappyPath();
    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      timestamp: string;
    };
    expect(typeof snapshotInput.timestamp).toBe("string");
    expect(() => new Date(snapshotInput.timestamp).toISOString()).not.toThrow();
  });

  it("passes scanTargets as a non-empty array to writeSnapshot", async () => {
    setupHappyPath();
    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      scanTargets: string[];
    };
    expect(Array.isArray(snapshotInput.scanTargets)).toBe(true);
    expect(snapshotInput.scanTargets.length).toBeGreaterThan(0);
  });

  it("gracefully handles all three single collectors failing (full degraded run)", async () => {
    mockCollectAcyclicity.mockImplementation(() => {
      throw new Error("acyclicity failed");
    });
    mockCollectModularity.mockImplementation(() => {
      throw new Error("modularity failed");
    });
    mockCollectRedundancy.mockImplementation(() => {
      throw new Error("redundancy failed");
    });
    mockCollectStructural.mockImplementation(() => {
      throw new Error("structural failed");
    });
    mockWriteSnapshot.mockReturnValue("/fake/path/snapshot.md");

    await import("../src/index.js");

    const snapshotInput = mockWriteSnapshot.mock.calls[0]![0] as {
      composite: number | null;
      failures: { name: string; error: string }[];
    };
    expect(snapshotInput.composite).toBeNull();
    expect(snapshotInput.failures.length).toBeGreaterThanOrEqual(4);
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });
});
