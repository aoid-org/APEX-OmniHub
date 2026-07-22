import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateDiff } from "../../src/propose/types.js";

const mockExecFileSync = vi.fn();
const mockMkdtempSync = vi.fn();
const mockRmSync = vi.fn();
const mockSymlinkSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));
vi.mock("node:fs", () => ({
  mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
  symlinkSync: (...args: unknown[]) => mockSymlinkSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

class ExecError extends Error {
  stdout: string;
  stderr: string;
  constructor(message: string, stdout = "", stderr = "") {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const DIFF: CandidateDiff = { filesTouched: ["src/a.ts"], linesChanged: 5, patch: "diff content" };

function argsInclude(args: unknown, needle: string): boolean {
  return Array.isArray(args) && args.includes(needle);
}

describe("runSandboxCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockMkdtempSync.mockReturnValue("/tmp/arise-propose-sandbox-abc");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails at the apply step when git worktree add fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "git" && argsInclude(args, "add") && argsInclude(args, "--detach")) {
        throw new Error("fatal: could not create worktree");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(false);
    expect(result.step).toBe("apply");
    expect(result.output).toContain("git worktree add failed");
  });

  it("fails at the apply step when git apply fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "git" && Array.isArray(args) && args[0] === "apply") {
        throw new Error("error: patch does not apply");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(false);
    expect(result.step).toBe("apply");
    expect(result.output).toContain("patch does not apply");
  });

  it("fails at the typecheck step and surfaces stdout/stderr in the output", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        throw new ExecError("tsc failed", "error TS2322: Type mismatch", "");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(false);
    expect(result.step).toBe("typecheck");
    expect(result.output).toContain("Type mismatch");
  });

  it("fails at the lint step when typecheck passes but lint fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "lint")) {
        throw new Error("eslint error");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(false);
    expect(result.step).toBe("lint");
  });

  it("fails at the test step when typecheck and lint pass but test fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "test")) {
        throw new Error("test failed");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(false);
    expect(result.step).toBe("test");
  });

  it("passes when worktree add, apply, typecheck, lint, and test all succeed", async () => {
    mockExecFileSync.mockReturnValue("");
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);

    expect(result.passed).toBe(true);
    expect(result.step).toBeNull();
  });

  it("symlinks node_modules from the main checkout before running checks", async () => {
    mockExecFileSync.mockReturnValue("");
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    await runSandboxCheck(DIFF);

    expect(mockSymlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("node_modules"),
      expect.stringContaining("node_modules"),
      "dir",
    );
  });

  it("always removes the worktree via `git worktree remove`, even when a check step fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "test")) {
        throw new Error("test failed");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    await runSandboxCheck(DIFF);

    const removeCalls = mockExecFileSync.mock.calls.filter(
      (call) => call[0] === "git" && argsInclude(call[1], "remove"),
    );
    expect(removeCalls.length).toBeGreaterThan(0);
  });

  it("always cleans up the temp worktree directory via rmSync", async () => {
    mockExecFileSync.mockReturnValue("");
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    await runSandboxCheck(DIFF);

    expect(mockRmSync).toHaveBeenCalledWith("/tmp/arise-propose-sandbox-abc", { recursive: true, force: true });
  });

  it("writes the patch content to a temp file before applying it", async () => {
    mockExecFileSync.mockReturnValue("");
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    await runSandboxCheck(DIFF);

    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining(".patch"), DIFF.patch, "utf-8");
  });

  it("never runs lint or test after typecheck fails", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        throw new Error("tsc failed");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    await runSandboxCheck(DIFF);

    const npmCalls = mockExecFileSync.mock.calls.filter((call) => call[0] === "npm");
    expect(npmCalls).toHaveLength(1);
  });
});

describe("runSandboxCheck error formatting edges", () => {
  it("uses stderr when stdout is absent on an exec-style failure", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        throw new ExecError("tsc failed", "", "stderr-only failure");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");

    const result = await runSandboxCheck(DIFF);
    expect(result.output).toContain("stderr-only failure");
  });

  it("stringifies non-Error thrown values from command execution", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        throw "string failure";
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");

    const result = await runSandboxCheck(DIFF);
    expect(result.output).toContain("string failure");
  });

  it("handles exec error with both stdout and stderr defined", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        throw new ExecError("tsc failed", "stdout content", "stderr content");
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);
    expect(result.output).toBe("stdout contentstderr content");
  });

  it("uses an empty string fallback when stdout or stderr is undefined on exec error", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        const err = { stdout: undefined, stderr: "only stderr" };
        throw err;
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);
    expect(result.output).toBe("only stderr");

    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        const err = { stdout: "only stdout", stderr: undefined };
        throw err;
      }
      return "";
    });
    const result2 = await runSandboxCheck(DIFF);
    expect(result2.output).toBe("only stdout");
  });

  it("handles an error object with neither stdout nor stderr properties", async () => {
    mockExecFileSync.mockImplementation((cmd: string, args: unknown) => {
      if (cmd === "npm" && argsInclude(args, "typecheck")) {
        const err = { message: "plain error message" };
        throw err;
      }
      return "";
    });
    const { runSandboxCheck } = await import("../../src/propose/sandbox.js");
    const result = await runSandboxCheck(DIFF);
    expect(result.output).toBe("[object Object]");
  });
});
