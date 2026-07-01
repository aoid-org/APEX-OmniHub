import type { CandidateDiff, EnvelopeVerdict, ProposePolicy } from "./types.js";

/**
 * hard_blocked_always only ever uses two shapes in this repo's policy file:
 * an exact path, or a directory prefix ending in "/**". No other glob
 * syntax is supported — anything else would silently under-match.
 */
function matchesBlockedPattern(filePath: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return filePath === prefix || filePath.startsWith(`${prefix}/`);
  }
  return filePath === pattern;
}

/**
 * The single source of truth for "is this patch allowed." Every other
 * propose/** module calls into this — nothing else duplicates the logic.
 * Pure and I/O-free: callers load the policy (policy-loader.ts) and the
 * candidate diff (sandbox.ts / model.ts) and pass both in.
 */
export function validateEnvelope(diff: CandidateDiff, policy: ProposePolicy): EnvelopeVerdict {
  for (const file of diff.filesTouched) {
    const hit = policy.hardBlockedAlways.find((pattern) => matchesBlockedPattern(file, pattern));
    if (hit) {
      return {
        allowed: false,
        reason: "HARD_BLOCKED_PATH",
        detail: `${file} matches hard_blocked_always pattern "${hit}"`,
      };
    }
  }

  if (diff.filesTouched.length > policy.tier1.maxFilesChanged) {
    return {
      allowed: false,
      reason: "TOO_MANY_FILES",
      detail: `${diff.filesTouched.length} files touched, tier_1_propose limit is ${policy.tier1.maxFilesChanged}`,
    };
  }

  if (diff.linesChanged > policy.tier1.maxLinesChanged) {
    return {
      allowed: false,
      reason: "TOO_MANY_LINES",
      detail: `${diff.linesChanged} lines changed, tier_1_propose limit is ${policy.tier1.maxLinesChanged}`,
    };
  }

  return { allowed: true };
}
