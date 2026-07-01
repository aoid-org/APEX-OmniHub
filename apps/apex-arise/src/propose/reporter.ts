import type { ProposeOutcome } from "./types.js";

function header(isoDate: string): string {
  return `# A.R.I.S.E. Propose Report: ${isoDate}

Phase 1b (Propose Engine). Bounded, PR-only, human-merge-required proposals.
No autonomous merge exists anywhere in this pipeline.
`;
}

/** Renders the Phase 1b propose run outcome. Every run writes one — even a no-op or a rejection. */
export function generateProposeReport(outcome: ProposeOutcome, timestamp: string): string {
  const isoDate = timestamp.slice(0, 10);
  const top = header(isoDate);

  switch (outcome.kind) {
    case "model_unavailable":
      return `${top}
## Outcome: Model Unavailable

The model call failed closed: \`${outcome.error}\`. No diff was proposed, no PR opened.

## Next Action

Re-run \`bun run arise:propose\` once the underlying issue (credentials, network,
or model response shape) is resolved.
`;

    case "no_target":
      return `${top}
## Outcome: No Target Found

${outcome.reason}

## Next Action

No PR opened. Re-run once a qualifying redundancy finding exists.
`;

    case "envelope_rejected": {
      const violationNote = outcome.policyViolation
        ? "**POLICY VIOLATION** — the proposed diff touched a hard-blocked path. This is distinct from a normal size rejection: it should prompt a review of the propose engine's target selection, not just a re-run."
        : "Normal Tier 1 envelope rejection (size cap), not a policy violation.";
      return `${top}
## Outcome: Envelope Rejected

**Reason:** ${outcome.reason}
**Detail:** ${outcome.detail}

${violationNote}

## Next Action

No PR opened. The model's proposed diff exceeded the \`tier_1_propose\` envelope
or touched a hard-blocked path; it was discarded before any sandbox test ran.
`;
    }

    case "sandbox_failed":
      return `${top}
## Outcome: Sandbox Tests Failed

**Failed step:** ${outcome.step ?? "unknown"}

\`\`\`
${outcome.output.slice(0, 4000)}
\`\`\`

## Next Action

No PR opened. The proposed diff passed the envelope check but failed
verification in the isolated sandbox worktree; it was discarded.
`;

    case "unexpected_error":
      return `${top}
## Outcome: Degraded Run (Unexpected Error)

An unexpected error occurred outside the model/envelope/sandbox contract
boundaries: \`${outcome.error}\`. No diff was proposed, no PR opened.

## Next Action

Re-run \`bun run arise:propose\` once the underlying issue is resolved. If
this recurs, treat it as a bug in the propose engine itself, not a normal
rejection.
`;

    case "proposed":
      return `${top}
## Outcome: Patch Proposed

**Confidence:** ${outcome.proposal.confidence}
**Files touched:** ${outcome.diff.filesTouched.join(", ")}
**Branch:** \`${outcome.branchName}\`

**Rationale:** ${outcome.proposal.rationale}

## Next Action

A pull request has been opened for human review. This proposal was never
auto-merged and never will be — \`auto_merge: false\` is enforced by
\`policy/arise-policy.yaml\`'s \`tier_1_propose\` block.
`;
  }
}
