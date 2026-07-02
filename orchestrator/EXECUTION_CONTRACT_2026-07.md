---
version: 2.0.0
date: 2026-07-02
scope: orchestrator/ only
inherits: CLAUDE.md, AGENTS.md, .agents/protocols/omnihub-orchestrator-core.md
---

# APEX-OmniHub Orchestrator Execution Contract v2.0

## B1. Mandatory Preamble

You are operating under the APEX-OmniHub Orchestrator Execution Contract v2.0, scoped to
`orchestrator/` only. This contract inherits CLAUDE.md and AGENTS.md in full; where this
contract is silent, those govern. You may not invent, remove, rename, reroute, or
re-architect any module in `orchestrator/` outside what this contract authorizes. You may
not add any new dependency, package, or external service under any circumstances — if a
task appears to require one, halt and report BLOCKED-DEPENDENCY; do not substitute or
work around it. One task per session (§B3 defines "task"). Write a failing test before any
code change. Push to GitHub on pass; revert immediately on fail (§B10). If blast radius
exceeds 5 files, halt and report BLOCKED-SCOPE as an architecture-change escalation.
Never self-declare production certification — CI validates, the owner certifies.

## B2. Negative Constraints (terminology firewall)

- **APEX** → TypeScript/Supabase/Python ecosystem only. Reject Oracle APEX/PL-SQL.
- **Omnislate** → proprietary unified chat interface only. Reject unrelated fictional lore.
- **Triforce Guardian** → zero-trust security architecture only. Reject franchise lore.
- **MAN Mode** → Temporal.io deterministic manual-override governance only. Reject
  industrial-automation meanings.

## B2.5. Skill Routing (per CLAUDE.md — do not deviate)

| Work type | Invoke |
|---|---|
| Phase 0 audit, diagnosis, gap-finding | `apex-master-debug-claude` |
| Phase 1/2 general orchestrator dev, wiring, feature work | `apex-boost-claude` |
| Any task touching live Supabase, Cloudflare, or edge functions (e.g., FR4 re-enable) | `omnidev-apex-pro-v2` |
| — | `apex-dev` is **banned** (superseded per CLAUDE.md) |

## B3. Definition of a Task

One task = one PR-sized, single-responsibility change that:
- touches ≤5 files (§B5),
- has one clear pass/fail test outcome,
- can be described in one sentence before starting (if it can't, split it before writing
  code, not after).

If mid-session the true scope turns out larger, stop — do not silently expand — report
`BLOCKED-SCOPE: [description]. Recommend splitting into: [list].` and wait.

## B4. Execution Cadence

- One task per session.
- Test manually against §B9 commands before considering a task "pass."
- On pass: push immediately (§B10). On fail: revert immediately (§B10) — no partial-fix
  cascading, no hallucinated patches.
- Debugging-attempt cap (per AGENTS.md): 3 focused attempts per failure; then stop and
  report `UNCERTAIN:[gap]`.
- Append one line per task to `orchestrator/EXECUTION_LOG_2026-07.md`: task description,
  files touched, test result, push/revert outcome. Not optional.

## B5. Blast-Radius Check

No orchestrator equivalent of `scripts/omnidash-blast-radius.ts` exists. First task of
Phase 1 (as its own single task): create `scripts/orchestrator-blast-radius.ts` (or `.py`)
using the same file-count-vs-main logic, threshold 5, same report format. Dependency-free.

## B6. Escalation Taxonomy

| Code | Meaning |
|---|---|
| BLOCKED-CONFIG | Required config/env var missing |
| BLOCKED-INFRA | Config present but service unreachable/non-2xx |
| BLOCKED-DEPENDENCY | Task requires a new package/vendor/service |
| BLOCKED-COST | Task requires raising an infra tier / spend (e.g., FR4 ≥2 GB worker) |
| BLOCKED-SCOPE | True task size exceeds §B3, or blast radius >5 files |
| CODE BUG | Reachable infra, but logic is wrong |
| UNCERTAIN:[gap] | 3 focused attempts exhausted, root cause unclear |

Any of these → halt all further tool calls on that task, log it, wait for JR. No discretion.

## B7. Phase 0 — Forensic Audit (first task, no exceptions)

Using `apex-master-debug-claude`, audit `orchestrator/` — every file in `activities/`,
`core/`, `workflows/`, `security/`, `infrastructure/`, `omniboard/`, `omnilink/`,
`policies/`, `providers/database/`. For each: actual purpose (from code, not filename),
test coverage (name the file or state "no test found"), and whether behavior matches
README.md, ARCHITECTURE.md, IMPLEMENTATION_SUMMARY.md, SEMANTIC_TRANSLATOR.md,
TEMPORAL_MONITORING.md. Flag every mismatch. Cross-reference `core/intent_registry.py`,
`core/model_registry.py`, `activities/universal_intents.py` against real call sites —
report exactly which apps/flows are genuinely routed today versus referenced-but-unwired.
Apply the 3-attempt cap (§B4) to any ambiguous finding. Do not fix anything.
Output: `orchestrator/AUDIT_2026-07.md`, every claim tied to a file path or test name.

**Gate to exit Phase 0:** AUDIT_2026-07.md exists, zero unsupported claims, JR has
reviewed it. Do not start Phase 1 without this.

## B8. Evidence & Reporting Requirements

Every phase closes with a repo artifact, not a chat summary: `AUDIT_2026-07.md` (Phase 0),
`EXECUTION_LOG_2026-07.md` (running, every task), `ORCHESTRATOR_CERTIFICATION.md`
(Phase 2, final). Every claim cites a file path, test name, or CI run reference. No claim
rests on "should work" — either evidence was found, or the gap is stated.

## B9. Test / Gate Commands (from actual package.json — do not invent alternates)

```bash
npm run lint:py            # ruff check + format check (orchestrator/)
npm run test:py            # pytest -q (orchestrator/)
npm run ci:py              # both of the above
npm run ci:runtime-gates   # full repo gate suite — only if a change touches shared contracts
```

## B10. Git & Revert Mechanics

Branch target (resolved 2026-07-02): **feature branch + draft PR; never merge to main
autonomously.** When the session designates a branch, that designation wins over the
naming template below.

```bash
# Start of task
git checkout -b orchestrator/p{phase}-{task-slug}   # or the session-designated branch
# On pass
git add <only the ≤5 files this task touched>
git commit -m "orchestrator(p{phase}): {one-line task description}"
git push -u origin <branch>
# Open PR (draft); do not merge to main autonomously.
# On fail
git checkout .        # discard uncommitted changes
git checkout main
git branch -D <task-branch>
# Log the failure per §B4/§B6; do not attempt a second uncommitted patch on the same branch.
```

## Owner Standing Approval (2026-07-02)

JR pre-approved non-destructive streamlining/decomplexification opportunities, executed
analytically and carefully. Interpretation under this contract: such items are recorded
(AUDIT §9) and executed as ordinary §B3 single tasks with full test gates — the approval
waives the "ask first" step for safe simplifications, not the task-sizing, testing,
blast-radius, or logging rules.
