---
version: 1.0.0
created: 2026-06-21
last_audited: 2026-06-21
status: archived
archived_date: 2026-06-22
supersedes: CURRENT_PLATFORM_STATE_2026_06_20.md
superseded_by: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-21

> **⚠️ HISTORICAL / ARCHIVED (2026-06-22).** Superseded by [`CURRENT_PLATFORM_STATE_2026_06_22.md`](./CURRENT_PLATFORM_STATE_2026_06_22.md). Retained verbatim as a point-in-time record — do **not** treat the counts, HEAD, or version below as current.
>
> **Canonical drift-control snapshot taken 2026-06-21 against `main` HEAD `966d695f`.** Supersedes `CURRENT_PLATFORM_STATE_2026_06_20.md`. Historical dated snapshots remain valid as point-in-time evidence only where they do not conflict with this snapshot, `project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `architecture/ARCHITECTURE_CANONICAL_MAP.md`.
>
> **Date note (anti-drift):** the snapshot/audit was performed 2026-06-21. PR #1441 was *merged* during this session; its squash commit `966d695f` carries git author date 2026-06-20 (the underlying commits were authored 2026-06-20). Event dates below use the verified `git log` dates; the audit date is 2026-06-21.
>
> **Verification scope (honesty note):** repository counts, HEAD, versions, and the PR #1441 behavior changes were **directly verified this session** against the working tree and `git log`. Live infrastructure state (Render/Temporal/Supabase runtime health) is **carried forward** from the 2026-06-19 end-to-end verification recorded in `CURRENT_PLATFORM_STATE_2026_06_20.md` — it was **not** re-verified in this docs pass (no live credentials were used). It is labelled as carried-forward below.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-21 |
| Branch inspected | `main` |
| HEAD at snapshot | `966d695f` — fix(omnidash): canonical widget rescue and global drift guards (#1441) |
| Prior HEAD (2026-06-20 snapshot) | `6f859ec8` — fix(omnidash): repair widget modal contracts and action endpoint UX (#1436) |
| Package version | `1.7.1` (root `package.json`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Commits Since 2026-06-20 Snapshot (verified via `git log origin/main`)

| SHA | Date (git) | Description | PR |
|---|---|---|---|
| `6f859ec8` | 2026-06-19 | fix(omnidash): repair widget modal contracts and action endpoint UX (HEAD of prior snapshot) | #1436 |
| `0b06effe` | 2026-06-19 | docs: audit & snapshot platform state 2026-06-20 (APEX Agent LIVE) | #1437 |
| `c74a9a5f` | 2026-06-19 | ci+docs: wire `VITE_ORCHESTRATOR_URL` into prod build, pin orchestrator CORS, document topology | #1438 |
| `d0ae10da` | 2026-06-20 | fix(omnidash): normalize live module action ids | #1439 |
| `966d695f` | 2026-06-20 | fix(omnidash): canonical widget rescue and global drift guards — **current `main` HEAD** | #1441 |

### Correction to the 2026-06-20 snapshot (recorded here, not by mutating the dated file)

The `CURRENT_PLATFORM_STATE_2026_06_20.md` table labelled commit `0020ba6b` as "#1439 — canonical widget rescue — current main HEAD". That conflated two distinct PRs. The verified mapping is:

- **#1439** = `d0ae10da` — *fix(omnidash): normalize live module action ids*.
- **#1441** = `966d695f` (squash) — *fix(omnidash): canonical widget rescue and global drift guards*. `0020ba6b` was the **first commit of the PR #1441 branch**, not a separate `#1439` merge.

Per anti-drift discipline, the dated 2026-06-20 file is left intact as a point-in-time record; this snapshot supersedes it.

## OmniDash Canonical Widget Rescue — Completed & Hardened (PR #1441, `966d695f`)

PR #1441 began as the "canonical widget rescue and global drift guards" sweep and was completed with a corrective commit that closed the user-shoes / code-review blockers. Verified behavior changes now on `main`:

- **Links is a genuine local URL-staging surface.** `LinksModule.tsx` stages valid `http(s)` URLs in local component state, shows *"Links are staged locally until link-context persistence is connected."*, validates input (invalid URLs show validation copy and disable submit — the **Add Link button is never permanently disabled**), and shows *"OmniSlate context handoff is not connected yet."* for the not-wired handoff. Links never imports or invokes `OmniBoardWizard` and never calls `trigger-workflow`.
- **Links baseline copy is honest.** `moduleData.json` headline now describes URL/reference collection for OmniSlate/agent context; the prior "Connected services and integration endpoints." integration-service framing is removed.
- **Live `omnilink-port` Links resolver is honest.** The `links` branch of `module-state` no longer reads the `integrations` table and no longer returns the integration-only `test-all` verb; it returns an empty link-context state with safe actions. No link-context persistence table was created (deferred, gated on JR approval). Recorded in `docs/APEX_AGENT_OPERATIONS.md §9.1`.
- **Module-keyed capability map.** `moduleActionCapabilities.ts` replaced the global action whitelist with a map keyed by `moduleKey + actionId` (covering baseline and live ids). Unsupported actions fail-closed at the UI shell with module-specific copy and never call `trigger-workflow`.
- **Label normalization.** Backend labels equal to the action id or containing underscores are humanized (`create_workflow` → `Create Workflow`) without implying the action is wired.
- **OmniBoard wizard hardening.** `OmniBoardWizard.tsx` keeps app-integration copy and adds an `AbortController` request timeout while preserving the explicit error taxonomy: missing config, invalid URL, unreachable/CORS, HTTP non-2xx, auth required, timeout. It never fakes a successful connection.

## APEX Agent — LIVE (carried forward from 2026-06-19 verification)

> Carried forward from `CURRENT_PLATFORM_STATE_2026_06_20.md`; **not** re-verified in this docs pass. See that file and `docs/operations/APEX_AGENT_RESTORATION_EVIDENCE.md` for the original trace evidence.

The APEX Agent was restored to **LIVE / demo-ready** on 2026-06-19 with a real prompt traversing the full path: OmniSlate UI → Cloudflare Pages Function `/api/mcp/invoke` → Supabase `apex-agent` → Render `apex-orchestrator-api` → Temporal Cloud (ns `apex-omnihub-temporal.i7ero`, ca-central-1) → Render worker → Supabase `agent_runs` completed → SSE → UI answer. Verified traces (2026-06-19): `61ce8dce`, `861d9f0c`, `da6e7fe5` (completed with LLM reply), `512eb247` (failed diagnostic). `omni_policies` provisioned with 7 tailored governance policies.

## Repo Stats (Verified 2026-06-21, this session)

| Area | Count / State | Verification command |
|---|---|---|
| Source files under `src/` | 326 TypeScript/TSX | `find src -type f \( -name '*.ts' -o -name '*.tsx' \)` |
| React components under `src/` | 94 `.tsx` | `find src -type f -name '*.tsx'` |
| Page routes under `src/pages/` | 0 (routes live under app/domain folders) | `find src/pages -type f` |
| Supabase Edge Function directories | 32 (31 function dirs + `_shared`) | `find supabase/functions -maxdepth 1 -mindepth 1 -type d` |
| Supabase SQL migrations | 94 `.sql` total = 90 forward + 4 rollback (`migrations/rollback/`) | `find supabase/migrations -name '*.sql'` |
| GitHub workflow files | 23 | `find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \)` |
| Custom hooks (`src/` + `apps/`) | 38 (`use*.ts*`) | `find src apps -type f -name 'use*.ts*'` |
| Python orchestrator files | 103 | `find orchestrator -name '*.py'` |
| Test/spec source files (`tests`,`e2e`,`sim`,`apps`,`orchestrator`,`packages`) | 346 | `find … \( -name '*.test.*' -o -name '*.spec.*' -o -name 'test_*.py' -o -name '*_test.py' \)` |
| Root package version | `1.7.1` | `package.json` |
| App package version | `1.3.10` | `apps/omnihub-site/package.json` |

## Local Verification Gates Run This Session (PR #1441 corrective commit)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `tsc -b --noEmit` | exit 0 |
| Lint | `eslint .` | exit 0 |
| OmniDash tests | `vitest run tests/omnidash` | 585 passed, 27 skipped, 19 todo |
| Build | `vite build` | success |
| Ops-doc guard | `node scripts/ci/check-ops-doc-drift.mjs` | PASS |

## Infrastructure State (carried forward from 2026-06-20 — not re-verified this pass)

| Component | Status (as of 2026-06-19 verification) |
|---|---|
| APEX Agent (end-to-end) | LIVE — demo-ready |
| `apex-orchestrator-api` (Render) | Running — `/health` 200 |
| `apex-orchestrator-worker` (Render) | Running — `SEMANTIC_CACHE_ENABLED=false` (512 MB Starter) |
| Temporal Cloud | Connected — ns `apex-omnihub-temporal.i7ero`, ca-central-1 |
| Supabase `agent_runs` | Live — completing runs to terminal states |
| `omni_policies` | Live — 7 tailored policies enforced |
| `apex-omnihub-shadow` CF Pages | Provisioned — shadow deploys active |
| Ops Doc Guard CI check | Active — fails PRs that change runtime contracts without updating `docs/APEX_AGENT_OPERATIONS.md` |

## Authority

| Concern | Authority |
|---|---|
| Certification verdict | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture topology | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| APEX Agent operations | `docs/APEX_AGENT_OPERATIONS.md` |
| CI/release gate | `.github/workflows/release.yml` |
| Ops-doc drift enforcement | `.github/workflows/ops-doc-guard.yml` + `scripts/ci/check-ops-doc-drift.mjs` |
| This document superseded by | `CURRENT_PLATFORM_STATE_<YYYY_MM_DD>.md` when next session produces one |
