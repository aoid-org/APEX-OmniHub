---
version: 1.1.0
created: 2026-06-20
last_audited: 2026-06-20
status: archived
archived_date: 2026-06-21
supersedes: CURRENT_PLATFORM_STATE_2026_06_14.md
superseded_by: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-20

> **Canonical drift-control snapshot taken 2026-06-20 against `main` HEAD `6f859ec8`.** Supersedes `CURRENT_PLATFORM_STATE_2026_06_14.md`. Historical docs remain valid as point-in-time evidence only where they do not conflict with this snapshot, `project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `architecture/ARCHITECTURE_CANONICAL_MAP.md`.
>
> **Date note:** the snapshot/audit was performed 2026-06-20; the PR #1435 and #1436 merge *events* all landed 2026-06-19 (per git commit timestamps). Event dates below use the verified git dates.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-20 |
| Branch inspected | `main` |
| HEAD at snapshot | `6f859ec8` — fix(omnidash): repair widget modal contracts and action endpoint UX (#1436) |
| Prior landmark | `4bbd3e5b` — ops: APEX Agent restoration (#1435 squash-merge; PR branch tip `0eff5a6c`) |
| Prior HEAD (2026-06-14 snapshot) | `16f06b6f` — fix(ssrf): evaluate IPv4-mapped IPv6 via embedded IPv4 rules (#1393) |
| Package version | `1.7.1` (root `package.json`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Commits Since 2026-06-14 Snapshot (Key)

| SHA | Date | Description | PR |
|---|---|---|---|
| `73d23da3` | 2026-06-19 | style(orchestrator): fix ruff check + format gates | #1434 |
| `b10aaa72` | 2026-06-19 | fix(orchestrator): omnipolicy loader degrades to no-policies when table absent | — |
| `6eaff809` | 2026-06-19 | feat(orchestrator): surface respond_to_user reply in completed agent_response | — |
| `a7ecf50f` | 2026-06-19 | feat(orchestrator): register respond_to_user activity on worker | — |
| `310221c9` | 2026-06-19 | feat(orchestrator): register respond_to_user tool contract | — |
| `4e92b8a9` | 2026-06-19 | feat(orchestrator): add respond_to_user conversational tool + planner rule | — |
| `49a8393f` | 2026-06-19 | feat(db): provision omni_policies table + tailored APEX governance policy set | — |
| `74dfce57` | 2026-06-19 | docs: add canonical APEX Agent operations & anti-drift reference | — |
| `f03b4232` | 2026-06-19 | docs: add canonical APEX Agent operations & anti-drift reference | — |
| `9eb10b3c` | 2026-06-19 | docs(ops): restoration smoke evidence + trace IDs | — |
| `41575282` | 2026-06-19 | docs(ops): promote APEX Agent runbook to official path | — |
| `767c9105` | 2026-06-19 | chore(governance): make 'update APEX_AGENT_OPERATIONS.md' a required PR check | — |
| `bb98fa50` | 2026-06-19 | test: align agent restoration gates with live runtime contracts | #1435 |
| `ad545fb3` | 2026-06-19 | docs: record APEX Agent migration-history baseline (2026-06-19) | #1435 |
| `0eff5a6c` | 2026-06-19 | ci: guard APEX Agent operations-doc drift (PR branch tip) | #1435 |
| `4bbd3e5b` | 2026-06-19 | ops: APEX Agent restoration — runbook, evidence, tag + ops-doc PR law (#1435 squash-merge to `main`) | #1435 |
| `6f859ec8` | 2026-06-19 | fix(omnidash): repair widget modal contracts and action endpoint UX | #1436 |
| `0020ba6b` | 2026-06-20 | fix(omnidash): canonical widget rescue and global drift guards — **current `main` HEAD** | #1439 |

## OmniDash Canonical Widget Rescue (2026-06-20)

To definitively cure recurring "widget drift" and integration hallucinations, a massive repo-wide sweep was executed and codified into global guards:
- **Absolute Product Truth Enforced:** OmniBoard is officially codified as the ONE AND ONLY user-facing UI endpoint for third-party application integration. Links is strictly an independent widget for collecting URLs.
- **Drift Guards:** `tests/omnidash/global-drift-guards.spec.tsx` permanently asserts that Links does not invoke or import OmniBoardWizard.
- **Action Gating:** `moduleActionCapabilities.ts` was deployed to centrally map and whitelist allowed module actions. Any hallucinated backend commands (like `manage_bundles`) are structurally rejected by the UI shell before networking occurs.
- **Visual Purity:** Strict adherence to APEX dark glass/orange aesthetics across all refactors.

## APEX Agent Restoration (2026-06-19 — Landmark Event)

The APEX Agent was restored from dead to **LIVE / demo-ready** on 2026-06-19. A real prompt traveled the full end-to-end path:

```
OmniSlate UI → Cloudflare Pages Function /api/mcp/invoke
  → Supabase Edge Function apex-agent
    → Render orchestrator API (apex-orchestrator-api)
      → Temporal Cloud (ns apex-omnihub-temporal.i7ero, ca-central-1)
        → Render Background Worker (apex-orchestrator-worker)
          → Supabase agent_runs (status=completed)
            → SSE queued → running → completed → UI rendered LLM answer
```

**Verified traces (live, authenticated):** `61ce8dce`, `861d9f0c`, `da6e7fe5` (completed with real LLM reply), `512eb247` (failed diagnostic — exposed missing omni_policies table).

**Root-cause chain resolved:** Upstash archived (429) → orchestrator Render service down → Temporal cert-vs-API-key gap → missing `slowapi` dep → missing env vars → worker OOM on 512 MB.

**Key operational files added:**
- `docs/APEX_AGENT_OPERATIONS.md` — anti-drift operations reference (canonical)
- `docs/operations/APEX_AGENT_RUNBOOK.md` — full operations runbook
- `docs/operations/APEX_AGENT_RESTORATION_EVIDENCE.md` — restoration evidence + trace IDs

**PR #1435 merged 2026-06-19** (squash-merge `4bbd3e5b`) — CI: 43 success / 3 skipped / 0 failed (46 total check runs). Includes stale-test fixes, migration-history baseline documentation, and real CI enforcement of the ops-doc rule (`scripts/ci/check-ops-doc-drift.mjs` + `.github/workflows/ops-doc-guard.yml`). **PR #1436 merged 2026-06-19** (`6f859ec8`) — CI: 46 success / 3 skipped / 0 failed (49 total) — repaired OmniDash widget modal contracts + action-endpoint UX (frontend + test files only; no runtime-contract, migration, or workflow change).
**PR #1439 merged 2026-06-20** (`0020ba6b`, current `main` HEAD) — Canonical Widget Rescue completed and documented.

## Repo Stats (Verified 2026-06-20)

| Area | Count / State |
|---|---|
| Source files under `src/` | 326 TypeScript/TSX |
| Supabase Edge Function directories | 32 (incl. `_shared`); 31 function dirs + 1 shared library |
| Supabase SQL migrations | 90 forward files (89 baselined as applied 2026-06-19 + `omni_policies` provisioned same day) + 4 rollback scripts under `migrations/rollback/` = 94 total `.sql` |
| GitHub workflow files | 23 (`ops-doc-guard.yml` added by PR #1435) |
| Python orchestrator files | 103 |
| Apps/omnihub-site package version | `1.3.10` |

## Migration History Baseline (2026-06-19)

Production Supabase had live schema objects while `supabase_migrations.schema_migrations` showed 0 applied migrations. All **89** migrations were **baselined as applied without re-running SQL** and without touching data. `omni_policies` provisioned the same day with 7 tailored policies. Repo now holds **90 forward migration files** (plus 4 rollback scripts under `migrations/rollback/`).

**Future rule:** never blindly run the full migration stack against production; use `supabase migration repair` on drift; only apply new additive/idempotent migrations forward. See `docs/APEX_AGENT_OPERATIONS.md §10` and `docs/operations/APEX_AGENT_RUNBOOK.md §11`.

## CI State (2026-06-20)

| PR | Merge commit | CI result | Key checks |
|---|---|---|---|
| #1434 (ruff/format) | `73d23da3` | ✅ merged green | |
| #1435 (agent restoration ops) | `4bbd3e5b` (tip `0eff5a6c`) | ✅ **ALL GREEN** — 43 success / 3 skipped / 0 failed (46 total) | `build-and-test`, `Operations doc drift guard`, SonarCloud QG passed |
| #1436 (omnidash modal contracts) | `6f859ec8` | ✅ **ALL GREEN** — 46 success / 3 skipped / 0 failed (49 total) | `build-and-test`, `Quality Gates`, `Security Gates`, SonarCloud QG passed |
| #1439 (canonical widget rescue) | `0020ba6b` | ✅ **ALL GREEN** | `build-and-test`, SonarCloud QG passed |

CI results verified via GitHub check-runs API 2026-06-20.

**`main` is GREEN as of `0020ba6b`.**

## Infrastructure State (2026-06-20)

| Component | Status |
|---|---|
| APEX Agent (end-to-end) | ✅ **LIVE** — demo-ready, verified 2026-06-19 |
| `apex-orchestrator-api` (Render) | ✅ Running — `/health` 200 |
| `apex-orchestrator-worker` (Render) | ✅ Running — `SEMANTIC_CACHE_ENABLED=false` (512 MB Starter) |
| Temporal Cloud | ✅ Connected — ns `apex-omnihub-temporal.i7ero`, ca-central-1 |
| Supabase `agent_runs` | ✅ Live — completing runs to terminal states |
| `omni_policies` | ✅ Live — 7 tailored policies enforced |
| `apex-omnihub-shadow` CF Pages | ✅ Provisioned — shadow deploys active |
| Ops Doc Guard CI check | ✅ Active — fails PRs that change runtime contracts without updating `docs/APEX_AGENT_OPERATIONS.md` |

## Authority

| Concern | Authority |
|---|---|
| Certification verdict | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture topology | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| APEX Agent operations | `docs/APEX_AGENT_OPERATIONS.md` |
| CI/release gate | `.github/workflows/release.yml` |
| Ops-doc drift enforcement | `.github/workflows/ops-doc-guard.yml` + `scripts/ci/check-ops-doc-drift.mjs` |
| This document superseded by | `CURRENT_PLATFORM_STATE_<YYYY_MM_DD>.md` when next session produces one |
