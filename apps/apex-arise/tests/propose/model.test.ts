import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProposeTarget } from "../../src/propose/types.js";

const mockGenerateText = vi.fn();
const mockCreateAnthropic = vi.fn();
const mockOutputObject = vi.fn((...args: unknown[]) => ({ kind: "object", opts: args[0] }));

class MockAPICallError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
  static isInstance(err: unknown): err is MockAPICallError {
    return err instanceof MockAPICallError;
  }
}

class MockNoOutputGeneratedError extends Error {
  static isInstance(err: unknown): err is MockNoOutputGeneratedError {
    return err instanceof MockNoOutputGeneratedError;
  }
}

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: (...args: unknown[]) => mockCreateAnthropic(...args),
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  Output: { object: (...args: unknown[]) => mockOutputObject(...args) },
  APICallError: MockAPICallError,
  NoOutputGeneratedError: MockNoOutputGeneratedError,
}));

const TARGET: ProposeTarget = {
  signal: "redundancy",
  clone: {
    firstFile: { path: "src/a.ts", startLine: 1, endLine: 10 },
    secondFile: { path: "src/b.ts", startLine: 1, endLine: 10 },
    lines: 10,
    tokens: 50,
  },
  firstFragment: "const x = 1;",
  secondFragment: "const x = 1;",
};

describe("proposeFix", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ARISE_MODEL_NAME;
    mockCreateAnthropic.mockReturnValue((modelId: string) => ({ modelId }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails closed with NOT_CONFIGURED when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { proposeFix } = await import("../../src/propose/model.js");

    const result = await proposeFix(TARGET);
    expect(result).toEqual({ available: false, error: "NOT_CONFIGURED" });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns a valid proposal on a well-formed model response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockResolvedValue({
      output: {
        proposed_diff: "diff --git a/src/a.ts b/src/a.ts",
        confidence: "high",
        rationale: "extracted a helper",
        files_touched: ["src/a.ts", "src/b.ts"],
      },
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    const result = await proposeFix(TARGET);
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.proposedDiff).toBe("diff --git a/src/a.ts b/src/a.ts");
      expect(result.confidence).toBe("high");
      expect(result.filesTouched).toEqual(["src/a.ts", "src/b.ts"]);
    }
  });

  it("passes the Zod schema through Output.object", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockResolvedValue({
      output: { proposed_diff: "d", confidence: "low", rationale: "r", files_touched: [] },
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    await proposeFix(TARGET);
    expect(mockOutputObject).toHaveBeenCalledWith(expect.objectContaining({ schema: expect.anything() }));
  });

  it("truncates an overlong rationale to 1000 chars", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockResolvedValue({
      output: { proposed_diff: "diff", confidence: "low", rationale: "x".repeat(2000), files_touched: [] },
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    const result = await proposeFix(TARGET);
    expect(result.available && result.rationale.length).toBe(1000);
  });

  it("classifies a timeout as TIMEOUT", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const abortError = new Error("The operation timed out");
    abortError.name = "TimeoutError";
    mockGenerateText.mockRejectedValue(abortError);
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "TIMEOUT" });
  });

  it("classifies an AbortError as TIMEOUT", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockGenerateText.mockRejectedValue(abortError);
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "TIMEOUT" });
  });

  it("classifies a 401 APICallError as AUTH_FAILURE", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue(new MockAPICallError("unauthorized", 401));
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "AUTH_FAILURE" });
  });

  it("classifies a 403 APICallError as AUTH_FAILURE", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue(new MockAPICallError("forbidden", 403));
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "AUTH_FAILURE" });
  });

  it("classifies a non-auth APICallError as ENDPOINT_ERROR", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue(new MockAPICallError("server error", 500));
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "ENDPOINT_ERROR" });
  });

  it("classifies a NoOutputGeneratedError as SCHEMA_INVALID", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue(new MockNoOutputGeneratedError("bad shape"));
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "SCHEMA_INVALID" });
  });

  it("classifies an unrecognized error as UNKNOWN_ERROR, never throwing past the boundary", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue(new Error("something weird"));
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "UNKNOWN_ERROR" });
  });

  it("classifies a non-Error throw as UNKNOWN_ERROR", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockGenerateText.mockRejectedValue("raw string failure");
    const { proposeFix } = await import("../../src/propose/model.js");

    expect(await proposeFix(TARGET)).toEqual({ available: false, error: "UNKNOWN_ERROR" });
  });

  it("respects the ARISE_MODEL_NAME override", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ARISE_MODEL_NAME = "claude-custom-model";
    let capturedModel: unknown;
    mockGenerateText.mockImplementation(async (opts: { model: unknown }) => {
      capturedModel = opts.model;
      return { output: { proposed_diff: "d", confidence: "low", rationale: "r", files_touched: [] } };
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    await proposeFix(TARGET);
    expect(capturedModel).toEqual({ modelId: "claude-custom-model" });
  });

  it("falls back to the default model id when ARISE_MODEL_NAME is unset", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    let capturedModel: unknown;
    mockGenerateText.mockImplementation(async (opts: { model: unknown }) => {
      capturedModel = opts.model;
      return { output: { proposed_diff: "d", confidence: "low", rationale: "r", files_touched: [] } };
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    await proposeFix(TARGET);
    expect(capturedModel).toEqual({ modelId: "claude-sonnet-4-5" });
  });

  it("includes both fragments and file paths in the prompt sent to the model", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    let capturedPrompt = "";
    mockGenerateText.mockImplementation(async (opts: { prompt: string }) => {
      capturedPrompt = opts.prompt;
      return { output: { proposed_diff: "d", confidence: "low", rationale: "r", files_touched: [] } };
    });
    const { proposeFix } = await import("../../src/propose/model.js");

    await proposeFix(TARGET);
    expect(capturedPrompt).toContain("src/a.ts");
    expect(capturedPrompt).toContain("src/b.ts");
    expect(capturedPrompt).toContain("const x = 1;");
  });
});
