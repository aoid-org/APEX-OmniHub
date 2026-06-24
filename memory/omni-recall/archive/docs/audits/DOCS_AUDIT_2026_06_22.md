---
version: 1.0.0
last_audited: 2026-06-22
status: verified
---

# Documentation Audit — 2026-06-22 (Comprehensive Docs Pass)

**Branch:** `claude/focused-ptolemy-dgd054`
**Trigger:** Comprehensive docs pass — scope repo state, audit all repo docs, update
stale documents not aligned to repo-truth. Began with the public `README.md` and
`memory/omni-recall/`.

## Method

- Repo-truth established by direct measurement against the working tree and `git log`
  (no live infrastructure credentials used; live-health claims are carried forward and
  labelled as such, not re-verified).
- **Dated snapshot/audit files were NOT rewritten.** Per omni-recall rules, point-in-time
  records (e.g. `CURRENT_PLATFORM_STATE_2026_06_06.md`, `REPO_STATUS_REPORT_2026-06-09.md`,
  release-readiness reports) are historical evidence and must stay true to their date.
  Only **living/canonical** docs that assert *current* state were corrected.

## Repo-truth facts (git-verified 2026-06-22)

| Fact | Value |
|---|---|
| `main` HEAD | `1f22570` (chore: exempt apex-governance.yml from ops drift guard) |
| Root package version | `1.8.1` (`package.json`); `1.8.2` in progress (`CHANGELOG.md`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| `src/` TS/TSX | 322 |
| `src/` `.tsx` | 92 |
| Edge function dirs | 33 (32 + `_shared`) |
| SQL migrations | 98 (94 forward + 4 rollback) |
| CI workflows | 23 |
| Orchestrator `.py` | 100 |
| Custom hooks (`use*.ts*`) | 39 |
| Test/spec source files | 373 (312 TS + 61 Python) |

## Files updated this pass (aligned to repo-truth)

| File | Change |
|---|---|
| `README.md` | Version 1.7.1 → 1.8.1; snapshot date → 2026-06-22; all file counts corrected; `main` HEAD pointer → `1f22570`; edge-function header 32 → 33; repo-layout counts |
| `memory/omni-recall/CLAUDE.md` | HEAD facts → 2026-06-22 (branch `claude/focused-ptolemy-dgd054`, main `1f22570`, v1.8.1); prior 06-21 audit retained as superseded |
| `memory/omni-recall/docs/README.md` | Platform Version 1.7.1 → 1.8.1; dates → 2026-06-22 |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | Facts table re-verified to 2026-06-22; version, HEAD, all counts |
| `memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md` | Version 1.7.1 → 1.8.1; head `966d695f` → `1f22570` |
| `memory/omni-recall/docs/infrastructure/PORTABILITY_MATRIX.md` | (earlier in branch) reconciled swap claims to actual evidence class; AWS = RFC-asserted, self-host = operator-local, DBeaver tooling evidence |

## Engineering landed on this branch (context for the docs)

- `orchestrator/providers/database/postgres_provider.py` + factory wiring — portable
  Postgres provider so Supabase → AWS RDS / Cloud SQL / self-host is a config-only swap.
- `src/lib/storage/providers/s3.ts` — server-safe S3/R2 storage adapter (foundation-only;
  no production consumer; GCS/Azure intentionally not implemented).

## Intentionally NOT changed (historical records — do not falsify)

- All `CURRENT_PLATFORM_STATE_2026_06_06/14/20/21.md` — dated snapshots; correct for their date.
- `audits/REPO_STATUS_REPORT_2026-06-09.md`, `audits/*RELEASE_READINESS*`, `audits/ANNOTATED_PR_TRIAGE_*` — point-in-time audits.
- `onboarding/DEVELOPER_ONBOARDING.md` release-history table rows (changelog of past releases).
- `compliance/THIRD_PARTY_NOTICES.md` `sonner 1.7.4` — dependency version, unrelated to platform version.
- `raw/` and `apex-dataroom/` — immutable source / data-room material.

## Prioritized remaining-review queue (NOT yet re-verified this pass)

These living docs may carry pre-1.8.1 or pre-Temporal-Cloud claims and should be checked
next; flagged here rather than silently skipped:

1. **`CURRENT_PLATFORM_STATE_2026_06_22.md`** — does not exist yet; a fresh snapshot should
   be cut to supersede the 06-21 doc (requires re-derivation; out of scope for this pass).
2. `docs/infrastructure/SUPABASE_SETUP.md`, `MIGRATION_RUNBOOK.md`, `DEPLOYMENT_ROLLOUT_PLAN.md`
   — verify provider/topology language matches Cloudflare-first + Temporal Cloud reality;
   `DEPLOYMENT_ROLLOUT_PLAN.md` is flagged Vercel-centric and likely fully elapsed.
3. `docs/operations/APEX_AGENT_RUNBOOK.md`, `docs/APEX_AGENT_OPERATIONS.md` — Temporal Cloud
   endpoint/auth facts (verify against orchestrator `config.py`).
4. `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`, `DOC_RECONCILIATION_MATRIX.md`,
   `EXECUTIVE_ARCHITECTURE_SUMMARY.md` — version/head references.
5. Root docs not touched this pass: `AGENTS.md`, `GTMMASTERPLAN.md`, `INTEGRATION_REPORT.md`,
   `next-action.md`, `plan.md`, `submission.md` — verify currency before relying on them.

## Honesty notes

- Live infrastructure health (APEX Agent / Render / Temporal / Supabase) was **not**
  re-verified in this pass — carried forward from 2026-06-19 and labelled as such.
- Counts are exact git measurements as of 2026-06-22 and will drift with each commit; the
  `CURRENT_PLATFORM_STATE` snapshot mechanism remains the canonical point-in-time record.
