> CI validates release readiness. Production certification is manual and owner-approved only.

---
version: 1.0.0
created: 2026-06-22
last_audited: 2026-06-22
status: verified
supersedes: CURRENT_PLATFORM_STATE_2026_06_21.md
---

> CI validates release readiness. Production certification is manual and owner-approved only.

# Current Platform State — 2026-06-22

> **Canonical drift-control snapshot taken 2026-06-22.** Supersedes
> [`CURRENT_PLATFORM_STATE_2026_06_21.md`](./CURRENT_PLATFORM_STATE_2026_06_21.md)
> (now archived/historical). Builds on the 06-06 → 06-14 → 06-20 → 06-21 chain;
> those remain valid point-in-time evidence only where they do not conflict with
> this snapshot.
>
> **Verification scope (honesty note):** repository counts, HEAD, versions, and
> the branch/main divergence were **directly verified this session** against the
> working tree and `git log`. Counts are measured on the **working branch**
> `claude/focused-ptolemy-dgd054` (see §Branch Divergence — they differ slightly
> from `main`). Live infrastructure health (Render/Temporal/Supabase/APEX Agent)
> is **carried forward** from the 2026-06-19 end-to-end verification — **not**
> re-verified here (no live credentials used).

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-22 |
| `main` HEAD | `1f22570` — chore: exempt apex-governance.yml from ops drift guard |
| Working branch inspected | `claude/focused-ptolemy-dgd054` (behind `main` by 8, ahead by 7) |
| Prior snapshot HEAD (06-21) | `966d695f` (#1441) |
| Root package version | `1.8.1` (root `package.json`; both `main` and branch) — `1.8.2` in progress (`CHANGELOG.md`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev |
| Certification authority | `docs/project-status/release-validation-summary.json` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `architecture/CANONICAL_TRUTH.md` |

## ⚠️ Branch Divergence & Pending Merge Reconciliation (NEW — key finding)

This snapshot is taken from working branch `claude/focused-ptolemy-dgd054`, which
**diverges from `main`**:

- **Behind `main` by 8 commits** — incl. `57a8a62` *docs: comprehensive repo-truth
  sync (PR #1462)*, `07216ae` *docs(portability-matrix): update verified swaps*, and
  CI/bun chores up to `1f22570`.
- **Ahead of `main` by 7 commits** — the portability-matrix evidence reconciliation,
  the portable Postgres provider, and the server-safe S3/R2 storage adapter (all
  unmerged).

**Files edited on BOTH sides → merge conflicts expected** on: `README.md`,
`memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md`,
`memory/omni-recall/docs/README.md`,
`memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_21.md`, and
`memory/omni-recall/docs/infrastructure/PORTABILITY_MATRIX.md`.

### 🔴 Substantive truth conflict — Portability Matrix swap status

| Claim | `main` (07216ae) | This branch (after git-history audit, `9f68646`) |
|---|---|---|
| Supabase → AWS | **✅ VERIFIED — "one night"** | **RFC-asserted / UNVERIFIED** — no AWS Terraform, SDK, RDS DSN, or screenshot in repo; IaC codifies Cloudflare+Upstash only. `public.ecr.aws/supabase/*` images are Supabase's registry, not an AWS deploy. |
| Supabase → Self-Host | **✅ VERIFIED — "hours"** | **Operator-local (Docker + DBeaver screenshots)** — demonstrated on the operator's machine; **not** committed infra (no Supabase self-host compose in repo). |
| Vercel → Cloudflare | ✅ VERIFIED | ✅ VERIFIED (repo-confirmed: Cloudflare Terraform + wrangler) |
| SECURITY-001 | ✅ CLOSED | ✅ CLOSED |
| Swap durations | stated as fact | flagged as **owner estimates, not timed** |

**Operator decision (2026-06-22):** the **branch's evidence-scoped version WILL overwrite
`main`'s version** at merge. `main`'s "VERIFIED" wording overstates repo-verifiable state;
the branch version is grounded in a direct `git log` / working-tree audit and corroborated
by the operator's own statements (times were estimated; AWS provisioning was being set up via
console/Gemini, not committed). At merge-conflict resolution, accept branch version for all
files touched on both sides.

> Note: `main`'s PR #1462 repo-truth sync (`57a8a62`) updated README counts/snapshot
> but **left the README version line at `1.7.1`** while `package.json` is `1.8.1`.
> This branch corrects that to `1.8.1`.

## Repo Stats (git-verified 2026-06-22, working branch `claude/focused-ptolemy-dgd054`)

> Includes unmerged provider files (+3 Python: `postgres_provider.py`,
> `_validation.py`, `test_postgres_provider.py`; +2 TS: `s3.ts`, `storage-s3.test.ts`).
> `main`'s counts are correspondingly lower by those files.

| Area | Count | Verification |
|---|---|---|
| Source files under `src/` | 322 TS/TSX | `git ls-files 'src/**/*.ts' 'src/**/*.tsx'` |
| React components under `src/` | 92 `.tsx` | `git ls-files 'src/**/*.tsx'` |
| Page routes under `src/pages/` | 0 | routes live under app/domain folders |
| Supabase Edge Function dirs | 33 (32 + `_shared`) | `find supabase/functions -maxdepth 1 -mindepth 1 -type d` |
| Supabase SQL migrations | 98 = 94 forward + 4 rollback | `find supabase/migrations -name '*.sql'` |
| GitHub workflow files | 23 | `git ls-files '.github/workflows/*'` |
| Custom hooks (`use*.ts*`) | 39 | `git ls-files 'src/**/use*' 'apps/**/use*'` |
| Python orchestrator files | 100 | `git ls-files 'orchestrator/**/*.py'` |
| Test/spec source files | 373 (312 TS + 61 Python) | `.test/.spec` + `test_*/_test.py` |
| Root package version | `1.8.1` | `package.json` |
| App package version | `1.3.10` | `apps/omnihub-site/package.json` |

## New This Session (on `claude/focused-ptolemy-dgd054`, unmerged)

- **Portability Matrix reconciliation** — swap claims scoped to actual evidence class
  (repo-verified / operator-local / RFC-asserted) instead of blanket "VERIFIED".
- **Portable Postgres provider** (`orchestrator/providers/database/postgres_provider.py`
  + factory wiring) — Supabase → AWS RDS / Cloud SQL / self-host is now a config-only
  swap (`DATABASE_PROVIDER=postgres|aws`). Shared SQL-injection guards in `_validation.py`.
- **Server-safe S3/R2 storage adapter** (`src/lib/storage/providers/s3.ts`) — foundation
  only; browser factory refuses S3 (would leak secrets); GCS/Azure intentionally not
  implemented; no production consumer yet.
- **Bun lockfile CI repair** — `bun.lock` was regenerated after the S3/R2 AWS SDK
  additions so `bun install --frozen-lockfile --ignore-scripts` no longer mutates the
  lockfile in Bun-based post-CI workflows. The nested npm `overrides` for protobuf remain
  in `package.json`/`package-lock.json` for npm enforcement; Bun still warns that nested
  overrides are unsupported, but frozen install now exits successfully.
- **Comprehensive docs pass** — README + omni-recall canon aligned to 2026-06-22
  repo-truth; `audits/DOCS_AUDIT_2026_06_22.md` ledger added.

## APEX Agent — LIVE (carried forward from 2026-06-19 verification)

> Carried forward from `CURRENT_PLATFORM_STATE_2026_06_20.md` / `_06_21.md`; **not**
> re-verified this pass.

Restored **LIVE / demo-ready** 2026-06-19: OmniSlate UI → Cloudflare Pages Function
`/api/mcp/invoke` → Supabase `apex-agent` → Render `apex-orchestrator-api` → Temporal
Cloud (ns `apex-omnihub-temporal.i7ero`, ca-central-1) → Render worker → Supabase
`agent_runs` completed → SSE → UI. Traces `61ce8dce`, `861d9f0c`, `da6e7fe5` completed;
`omni_policies` = 7 tailored policies.

## Infrastructure State (carried forward from 2026-06-19 — not re-verified this pass)

| Component | Status (as of 2026-06-19) |
|---|---|
| APEX Agent (end-to-end) | LIVE — demo-ready |
| `apex-orchestrator-api` (Render) | Running — `/health` 200 |
| `apex-orchestrator-worker` (Render) | Running — `SEMANTIC_CACHE_ENABLED=false` |
| Temporal Cloud | Connected — ns `apex-omnihub-temporal.i7ero`, ca-central-1 |
| Supabase `agent_runs` | Live — completing runs to terminal states |
| `omni_policies` | Live — 7 tailored policies |
| `apex-omnihub-shadow` CF Pages | Provisioned — shadow deploys active |

## Authority

| Concern | Authority |
|---|---|
| Certification verdict | `docs/project-status/release-validation-summary.json` |
| Architecture topology | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| APEX Agent operations | `docs/APEX_AGENT_OPERATIONS.md` |
| Portability/swap evidence | `docs/infrastructure/PORTABILITY_MATRIX.md` (branch version — evidence-scoped) |
| Docs audit ledger | `docs/audits/DOCS_AUDIT_2026_06_22.md` |
| This document superseded by | `CURRENT_PLATFORM_STATE_<YYYY_MM_DD>.md` when next session produces one |
