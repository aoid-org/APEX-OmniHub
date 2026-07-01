export interface Tier1ProposeLimits {
  maxLinesChanged: number;
  maxFilesChanged: number;
}

export interface ProposePolicy {
  tier1: Tier1ProposeLimits;
  hardBlockedAlways: string[];
}

export interface CandidateDiff {
  /** Repo-relative paths touched by the patch. */
  filesTouched: string[];
  /** Total added + removed lines across the patch. */
  linesChanged: number;
  /** Unified diff text. */
  patch: string;
}

export type EnvelopeRejectionReason = "TOO_MANY_LINES" | "TOO_MANY_FILES" | "HARD_BLOCKED_PATH";

export type EnvelopeVerdict =
  | { allowed: true }
  | { allowed: false; reason: EnvelopeRejectionReason; detail: string };

export interface RedundancyClone {
  firstFile: { path: string; startLine: number; endLine: number };
  secondFile: { path: string; startLine: number; endLine: number };
  lines: number;
  tokens: number;
}

export interface ProposeTarget {
  signal: "redundancy";
  clone: RedundancyClone;
  firstFragment: string;
  secondFragment: string;
}

export interface ModelProposal {
  proposedDiff: string;
  confidence: "low" | "medium" | "high";
  rationale: string;
  filesTouched: string[];
}

export type ModelErrorCode =
  | "TIMEOUT"
  | "AUTH_FAILURE"
  | "ENDPOINT_ERROR"
  | "SCHEMA_INVALID"
  | "NOT_CONFIGURED"
  | "UNKNOWN_ERROR";

export type ModelResult =
  | ({ available: true; error: null } & ModelProposal)
  | { available: false; error: ModelErrorCode };

export interface SandboxResult {
  passed: boolean;
  step: "apply" | "typecheck" | "lint" | "test" | null;
  output: string;
}

export type ProposeOutcome =
  | { kind: "model_unavailable"; error: string }
  | { kind: "no_target"; reason: string }
  | { kind: "envelope_rejected"; reason: EnvelopeRejectionReason; detail: string; policyViolation: boolean }
  | { kind: "sandbox_failed"; step: SandboxResult["step"]; output: string }
  | { kind: "proposed"; diff: CandidateDiff; proposal: ModelProposal; branchName: string }
  | { kind: "unexpected_error"; error: string };
