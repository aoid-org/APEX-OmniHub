---
version: 1.1.0
last_audited: 2026-07-22
status: stale-pending-rescore
---

> **Staleness notice (2026-07-22):** The 100/100 below was scored 2026-05-28 and is
> **not current**. `main` has moved ~2 months and dozens of PRs since (HEAD as of
> this note: `1048eb5225ac2ff39355bf66a39023813cd673bd`, PR #1654). This audit pass
> did **not** independently re-run the full gate/test suite (out of scope — this
> was a `memory/omni-recall/` documentation-only pass), so **no new total score is
> claimed here**; inventing one would violate this folder's own
> "do not mix audit claims with verified system truth" rule.
>
> What *is* independently git-verified from this session and the immediately
> preceding one (2026-07-22, PR #1654/#1655 — see `docs/APEX_AGENT_OPERATIONS.md`
> §9.34-9.36 for the full evidence trail):
> - `verify:claim-hygiene` — fixed and passing (PR #1654): the Armageddon
>   certification plaque's claims are now backed by an independently re-verified
>   genuine Ed25519 signature (live pubkey check against
>   `apexbusiness-systems/Armageddon-Core`), with a new permanent regression gate
>   `scripts/ci/verify-armageddon-attestation.mjs`.
> - Release-gate wiring audit (PR #1655, **open/draft, not yet merged as of this
>   note** — verify current state before relying on this): found and fixed a
>   duplicate gate registration in `verify-release.mjs`, wired 4 previously-orphaned
>   gates into CI (`guard-agent-destructive-actions.mjs`, `check-lockfile-sync.mjs`,
>   `check-edge-fn-manifest.mjs`, `verify-supabase-env-alignment.mjs`), fixed a
>   duplicate-stage bug in the local-only `release-lattice.mjs`, and added a new
>   forward guard `check-ops-doc-claim-integrity.mjs`. Per this PR's own commit log,
>   `bun run verify:release` passed end-to-end at the time of that PR's last local
>   run (vitest + pytest 1002 passed/20 skipped, build, security, supabase-security,
>   claim-hygiene, armageddon-attestation, supply-chain all green) — cited here as
>   PR-documented evidence, not independently re-run by this pass.
> - This does not amount to a full 20-row rescore. Treat every row below as
>   **historical (2026-05-28) evidence** until a full re-run produces a new score.
>   See also `RELEASE_GATE_AUDIT_2026-07-22.md` for a narrower, session-scoped
>   evidence snapshot in the same append-only-by-date convention as
>   `RELEASE_GATE_AUDIT_2026-05-16.md`.

# APEX-OmniHub 100-Point Release Rubric Score (historical: scored 2026-05-28)

> Rescored 2026-05-28 against **real, observed** evidence. Dependencies were installed
> (Node + a clean Python venv with the declared ML deps) and the **entire** gate suite was
> executed with exit 0 — including the orchestrator Python suite (`pytest`: 919 passed / 0
> failed). The earlier 100/100 was awarded on no-op gates and is withdrawn; this 100/100 is
> backed by observed command output. No row is scored on an unobserved command.

| Area | Score | Evidence |
|---|---:|---|
| Build truth and CI integrity | 7/7 | `verify:ci-integrity` real+PASS; tsc/eslint/vitest/build all exit 0 |
| Type safety and code quality | 5/5 | `tsc -b` 0 errors; `eslint .` exit 0; ruff pass; no new `any` |
| Security/auth/RBAC/tenant | 10/10 | Vitest suite incl. auth/tenant-isolation smoke PASS; CodeQL High alerts cleared |
| Durable orchestration | 8/8 | TS idempotency/Chronos tests PASS (Vitest) + Temporal Python worker tests PASS (pytest 919) |
| OmniDash truthfulness | 6/6 | `verify:claim-hygiene` PASS; module-state + badge tests PASS |
| OmniLink/OmniPort | 6/6 | omnilink/omniport edge tests PASS |
| OmniBridge | 5/5 | signed-ingress/replay/DLQ tests PASS; stack-trace barrier added |
| OmniConnect/OmniBoard | 5/5 | connector lifecycle/policy tests PASS |
| RSI governance | 4/4 | `verify:ci-integrity` confirms no fake-pass/duplicate governance gates |
| Iframe/CSP/sandbox | 5/5 | sandbox/CSP tests PASS |
| Physical AI safety | 5/5 | demo-gating + safety tests PASS (Vitest) + PhysiOmni saga/activities PASS (pytest) |
| BYOM governance | 5/5 | model-registry/governance tests PASS |
| Web3/blockchain safety | 4/4 | web3 tests PASS; CodeQL URL-sanitization alerts cleared |
| Universal sync/legacy | 4/4 | sync tests PASS; `UniversalSync` type error fixed |
| Observability/audit/SLO | 5/5 | telemetry/audit tests PASS; perf-smoke present |
| Supabase/RLS/secrets/privacy | 6/6 | `verify:supabase-security` PASS after partition-RLS fix; secret:scan clean |
| Supply chain/provenance | 4/4 | `verify:supply-chain` PASS; npm audit 0 critical/high/moderate; lockfiles committed |
| PWA/assets/accessibility/claims | 4/4 | `verify:assets` 7/7; claim-hygiene PASS; e2e a11y specs PASS |
| Release evidence/rollback | 6/6 | honest evidence pack, rollback + migration-rollback, incident runbook |

**TOTAL (verified this session):** 100/100

Every gate passed with an observed exit code: `tsc -b` (0 errors), `eslint .`, ruff
check+format, Vitest (2553 passed), **pytest (919 passed)**, Vite build, Playwright
chromium (22 passed), assets (7/7), secret:scan, npm audit (0 critical/high/moderate), and
all four integrity gates. All 11 CodeQL alerts (7 High / 4 Medium) are remediated.

**One deploy-time operator action remains** (does not affect this build score): apply
migration `20260528000000` (PhysiOmni partition RLS) to the live database. The migration is
written, has a rollback, and passes `verify:supabase-security` statically — applying it is a
standard deployment step that no clean-room build can perform.
