import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReadFileSync = vi.fn();
const mockOpenProposalPr = vi.fn();

vi.mock("node:fs", () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));
vi.mock("../../src/propose/pr.js", () => ({
  openProposalPr: (...args: unknown[]) => mockOpenProposalPr(...args),
}));

const METADATA = {
  branchName: "arise/propose-redundancy-20260701-abc123",
  filesTouched: ["src/a.ts", "src/b.ts"],
  confidence: "high",
  rationale: "extracted a helper",
};

describe("open-pr-cli", () => {
  let stubbedExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    stubbedExit = vi.fn();
    vi.stubGlobal("process", { ...process, exit: stubbedExit });
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockReadFileSync.mockImplementation((filePath: unknown) => {
      if (String(filePath).endsWith("candidate.patch")) return "diff --git a/src/a.ts b/src/a.ts";
      if (String(filePath).endsWith("metadata.json")) return JSON.stringify(METADATA);
      throw new Error(`unexpected read: ${String(filePath)}`);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads the candidate patch and metadata artifact, then opens a PR", async () => {
    mockOpenProposalPr.mockResolvedValue({ opened: true, url: "https://github.com/org/repo/pull/42" });
    await import("../../src/propose/open-pr-cli.js");

    expect(mockOpenProposalPr).toHaveBeenCalledWith(
      expect.objectContaining({
        branchName: METADATA.branchName,
        diff: expect.objectContaining({ patch: "diff --git a/src/a.ts b/src/a.ts", filesTouched: METADATA.filesTouched }),
        proposal: expect.objectContaining({ confidence: "high", rationale: METADATA.rationale }),
      }),
    );
    expect(stubbedExit).toHaveBeenCalledWith(0);
  });

  it("fails closed (exit 0, logged) when opening the PR fails", async () => {
    mockOpenProposalPr.mockResolvedValue({ opened: false, error: "GitHub API error 422" });
    await import("../../src/propose/open-pr-cli.js");

    expect(stubbedExit).toHaveBeenCalledWith(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("GitHub API error 422"));
  });
});
