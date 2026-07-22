---
version: 1.0.0
last_audited: 2026-07-22
status: verified
---

# Correction 006: New claim-integrity gate's scope overstated in draft §9.36, caught pre-push

Date: 2026-07-22
Scope: `docs/APEX_AGENT_OPERATIONS.md` §9.36 (PR #1655, open/draft at time of writing — see `start-here.md` for current merge state)

## What was wrong

While drafting `docs/APEX_AGENT_OPERATIONS.md` §9.36 to document the new
`scripts/ci/check-ops-doc-claim-integrity.mjs` forward guard (added in PR #1655),
the first version of the entry said the new gate "automates the process that
caught the PR #1646 fabricated dependency-audit claim" (that original incident
is `005-fabricated-dependency-audit-claim.md`). This implied the new gate would
have caught — or does retroactively catch — that class of fabrication.

**This overstated the gate's actual behavior.** `check-ops-doc-claim-integrity.mjs`
only fires on sections that cite an **inline commit SHA** directly next to a
`**Changed files:**` / `**Changed critical runtime path(s):**` line, then diffs
that SHA's real `git diff` against the claimed files. PR #1646's fabricated
§9.13 section cited a **PR number**, not an inline SHA — the gate's own matcher
would skip it (fails closed / does not fail on unresolvable citations, by
design). As of this writing the gate cross-checks **0** existing sections in
`APEX_AGENT_OPERATIONS.md`, because none of the current history entries use the
inline-SHA citation shape yet.

## Root cause

Drafted the doc entry from the gate's *intent* (why it was built — directly in
response to reading correction 005) rather than strictly from what its matcher
logic actually checks. The two are related but not the same claim, and the
difference matters exactly per this folder's own doctrine: "mixing audit claims
with verified system truth" is a listed common failure mode.

## Corrected state

`docs/APEX_AGENT_OPERATIONS.md` §9.36 (commit `b2f05d2` on branch
`claude/post-ci-workflow-error-9mcg2i`, part of PR #1655) now reads: the gate is
a **forward guard** for a stricter future citation style (inline SHA + explicit
file list); it does **not** retroactively re-verify existing entries; it
currently cross-checks 0 sections; and it would **not** have caught the PR #1646
fabrication as originally written. It is additive prevention, not a
reconstruction of that specific catch. This was corrected in the same session,
before the branch was pushed for review — no false claim reached a merged
commit on `main` from this instance.

## Prevention note

Same prevention rule as `005` and `2026-05-28-verify-gate-authenticity.md`,
applied one layer up: it is not enough to verify a *code change* actually
happened before describing it — a claim about what a *gate/check itself covers*
must also be checked against the gate's real matcher logic (which sections it
would and would not flag), not against the motivating incident that inspired
writing it. Before describing any new CI gate's coverage in
`APEX_AGENT_OPERATIONS.md`, state the precondition/trigger shape it actually
matches on, and explicitly test it against the historical incident being
referenced (as this gate was, via a synthetic legitimate + synthetic fabricated
fixture) rather than asserting the connection in prose alone.

## Promotion decision

Page-only for now (this file + the `start-here.md` 2026-07-22 session entry).
Not yet promoted to a standing directive in `CLAUDE.md` — the underlying rule
("a gate's described scope must match its actual matcher logic, verified
against a concrete fixture, not asserted from intent") is already implied by
the existing `2026-05-28-verify-gate-authenticity.md` directive. Re-promote
explicitly only if this specific sub-failure (claim-about-a-claim-checker
overstatement) recurs.
