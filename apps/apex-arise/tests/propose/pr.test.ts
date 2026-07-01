import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateDiff, ModelProposal } from "../../src/propose/types.js";

const mockExecFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));
vi.mock("node:fs", () => ({
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
  // No real binary on disk in tests: resolveGitPath falls back to the bare
  // "git" name, keeping existing assertions on the literal command valid.
  existsSync: () => false,
}));

const DIFF: CandidateDiff = { filesTouched: ["src/a.ts"], linesChanged: 5, patch: "diff --git a/src/a.ts" };
const PROPOSAL: ModelProposal = {
  proposedDiff: DIFF.patch,
  confidence: "high",
  rationale: "removed duplication",
  filesTouched: DIFF.filesTouched,
};

describe("buildPrBody", () => {
  it("includes the verbatim title, confidence, files touched, and rationale", async () => {
    const { buildPrBody } = await import("../../src/propose/pr.js");
    const body = buildPrBody(PROPOSAL, DIFF);

    expect(body).toContain("A.R.I.S.E. Phase 1b — automated proposal, requires human review");
    expect(body).toContain("high");
    expect(body).toContain("src/a.ts");
    expect(body).toContain("removed duplication");
    expect(body).toContain("auto_merge");
  });
});

describe("openProposalPr", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: "test-token",
      GITHUB_REPOSITORY: "apexbusiness-systems/apex-omnihub",
    };
    mockExecFileSync.mockReturnValue("");
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fails closed when GITHUB_TOKEN and GH_TOKEN are both missing", async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    const result = await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });
    expect(result.opened).toBe(false);
    expect(result.error).toContain("GITHUB_TOKEN");
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it("fails closed when GITHUB_REPOSITORY is missing", async () => {
    delete process.env.GITHUB_REPOSITORY;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    const result = await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });
    expect(result.opened).toBe(false);
  });

  it("opens a PR successfully on the happy path", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: "https://github.com/apexbusiness-systems/apex-omnihub/pull/9999" }),
    }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    const result = await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });
    expect(result).toEqual({ opened: true, url: "https://github.com/apexbusiness-systems/apex-omnihub/pull/9999" });
  });

  it("sends the exact required PR title verbatim, correct head and base, in the API request", async () => {
    let capturedBody = "";
    global.fetch = vi.fn().mockImplementation(async (_url: unknown, init: RequestInit) => {
      capturedBody = String(init.body);
      return { ok: true, json: async () => ({ html_url: "https://example.invalid/pr/1" }) };
    }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });

    const parsed = JSON.parse(capturedBody) as { title: string; head: string; base: string };
    expect(parsed.title).toBe("A.R.I.S.E. Phase 1b — automated proposal, requires human review");
    expect(parsed.head).toBe("arise/propose-test");
    expect(parsed.base).toBe("main");
  });

  it("honors a custom base branch when provided", async () => {
    let capturedBody = "";
    global.fetch = vi.fn().mockImplementation(async (_url: unknown, init: RequestInit) => {
      capturedBody = String(init.body);
      return { ok: true, json: async () => ({ html_url: "https://example.invalid/pr/1" }) };
    }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test", baseBranch: "develop" });

    const parsed = JSON.parse(capturedBody) as { base: string };
    expect(parsed.base).toBe("develop");
  });

  it("never issues a git push with --force or -f", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: "x" }) }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });

    const pushCalls = mockExecFileSync.mock.calls.filter(
      (call) => call[0] === "git" && Array.isArray(call[1]) && call[1][0] === "push",
    );
    expect(pushCalls.length).toBeGreaterThan(0);
    for (const call of pushCalls) {
      expect(call[1]).not.toContain("--force");
      expect(call[1]).not.toContain("-f");
    }
  });

  it("returns an error result (not a throw) when the GitHub API responds with a non-2xx status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Validation failed",
    }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    const result = await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });
    expect(result.opened).toBe(false);
    expect(result.error).toContain("422");
  });

  it("returns an error result when a git command throws, and still cleans up the patch file", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "git" && Array.isArray(args) && args[0] === "apply") {
        throw new Error("patch does not apply");
      }
      return "";
    });
    const { openProposalPr } = await import("../../src/propose/pr.js");

    const result = await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });
    expect(result.opened).toBe(false);
    expect(result.error).toContain("patch does not apply");
    expect(mockRmSync).toHaveBeenCalled();
  });

  it("never calls a merge endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: "x" }) }) as unknown as typeof fetch;
    const { openProposalPr } = await import("../../src/propose/pr.js");

    await openProposalPr({ diff: DIFF, proposal: PROPOSAL, branchName: "arise/propose-test" });

    const calledUrls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    for (const url of calledUrls) {
      expect(url).not.toContain("/merge");
    }
  });
});
