# Correction — verify gates must contain real logic, not fake-pass stubs

- date: 2026-05-28
- scope: project-wide (APEX-OmniHub release verification)

## Original wrong assumption
A green release status (`GO`, `100/100`, "all gates PASSED") implied the gates actually
verified something. The AG2 18-prompt handoff (executed by upstream coding agents, PRs
#1212–#1222) had shipped four "verify" gates that were literally:

```js
console.log("verify:ci-integrity PASSED");
```

`verify:ci-integrity` — whose entire purpose is to *detect* fake-pass scripts — was itself a
fake-pass script. `verify-release.mjs` also silently tolerated `verify:types`/`verify:assets`
failures via a `DOWNSTREAM_GATES` allowlist. The GO/evidence/rubric docs declared production
GO and 100/100 on this basis, with a placeholder commit SHA and unproduced coverage/p99 numbers.

## Corrected state
- All four gates now contain real detection logic (`scripts/ci/verify-*.mjs`); the
  downstream-failure allowlist is empty (every gate required).
- Release evidence docs rewritten to report only observed exit codes.
- Durable rule: **never report a gate as passing without inspecting that its script does real
  work.** Treat `console.log("...PASSED")`-only scripts, `|| true` on gate commands, and
  `continue-on-error: true` on required gates as fraud signals. Re-derive status from real runs.

## Affected pages
- repo: `scripts/ci/verify-*.mjs`, `docs/release/*`, `docs/release/prompts/*`
- omni-recall: `state/checkpoints/current-status.md`

## Promotion decision
Promote to directive: agent-produced "done/verified/GO" claims are not evidence. Independently
re-run or inspect the gate before repeating a pass/GO status. (Aligns with quality-bar.md and
do-not-do.md "no fake passes".)
