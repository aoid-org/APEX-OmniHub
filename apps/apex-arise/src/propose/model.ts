import { createAnthropic } from "@ai-sdk/anthropic";
import { APICallError, generateText, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { ModelErrorCode, ModelResult, ProposeTarget } from "./types.js";

const MODEL_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL_ID = "claude-sonnet-4-5";
const MAX_RATIONALE_CHARS = 1000;

const ProposalSchema = z.object({
  proposed_diff: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  files_touched: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are the A.R.I.S.E. Phase 1b propose engine for the APEX-OmniHub repository.
Your only job: given two near-duplicate code fragments detected by jscpd, propose a minimal, safe,
behavior-preserving diff that removes the duplication (e.g. by extracting a shared helper and having
both call sites use it instead). The diff must stay within a hard budget of at most 150 changed lines
across at most 5 files, must not change any observable behavior, and must not touch build config,
CI workflows, or policy files. If you cannot produce a safe diff within that budget, set confidence
to "low" and explain why in the rationale instead of guessing.`;

function buildPrompt(target: ProposeTarget): string {
  const { clone } = target;
  return `Duplicate block detected by jscpd (${clone.lines} lines, ${clone.tokens} tokens):

File A: ${clone.firstFile.path} (lines ${clone.firstFile.startLine}-${clone.firstFile.endLine})
\`\`\`
${target.firstFragment}
\`\`\`

File B: ${clone.secondFile.path} (lines ${clone.secondFile.startLine}-${clone.secondFile.endLine})
\`\`\`
${target.secondFragment}
\`\`\`

Propose a unified diff (git apply -p1 compatible, paths relative to the repo root) that removes this
duplication. Return proposed_diff as the raw unified diff text, files_touched as the list of
repo-relative paths the diff modifies, a confidence level, and a one-paragraph rationale.`;
}

function classifyError(err: unknown): ModelErrorCode {
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return "TIMEOUT";
  }
  if (APICallError.isInstance(err)) {
    return err.statusCode === 401 || err.statusCode === 403 ? "AUTH_FAILURE" : "ENDPOINT_ERROR";
  }
  if (NoOutputGeneratedError.isInstance(err)) {
    return "SCHEMA_INVALID";
  }
  return "UNKNOWN_ERROR";
}

/**
 * Mirrors tools/rsi/model_gateway.py's contract shape: fail-closed on every
 * error path (network, timeout, malformed response), 30s timeout, never
 * throws past this boundary. Callers always get a typed result, never an
 * exception.
 */
export async function proposeFix(target: ProposeTarget): Promise<ModelResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { available: false, error: "NOT_CONFIGURED" };
  }

  try {
    const anthropic = createAnthropic({ apiKey });
    const modelId = process.env.ARISE_MODEL_NAME || DEFAULT_MODEL_ID;

    const { output } = await generateText({
      model: anthropic(modelId),
      output: Output.object({ schema: ProposalSchema }),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(target),
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });

    return {
      available: true,
      error: null,
      proposedDiff: output.proposed_diff,
      confidence: output.confidence,
      rationale: output.rationale.slice(0, MAX_RATIONALE_CHARS),
      filesTouched: output.files_touched,
    };
  } catch (err) {
    return { available: false, error: classifyError(err) };
  }
}
