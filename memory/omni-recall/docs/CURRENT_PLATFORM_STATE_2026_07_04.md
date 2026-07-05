---
version: 1.9.0
created: 2026-07-04
last_audited: 2026-07-04
status: verified
supersedes: CURRENT_PLATFORM_STATE_2026_06_26.md
---

# Current Platform State — 2026-07-04

> **CURRENT AUTHORITY (2026-07-04):** local `work` branch at `d22ddcf` after fetching all remotes and verifying the working-tree facts below. This is a repository-state and documentation-truth snapshot, not live-production proof.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-07-04 |
| Verified HEAD | `d22ddcf` — fix(omnidash): surface alignment + glassmorphism repair pass (#1529) |
| Active branch in local audit environment | `work` |
| Remote check | `git fetch --all --prune` completed before this snapshot |
| Live/production state | Not verified by this documentation sync; owner/live evidence is still required for production certification gaps |
| Root package version | `1.8.3` |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Platform stack | Vite 7 + React 18 + TypeScript 5.9; Cloudflare Pages-aligned frontend; Supabase DB/Edge Functions; Render/Temporal orchestrator |
| CI/CD workflow count | **20** |
| Edge function dirs | **34** total (33 function dirs + `_shared`) |
| SQL migrations | **102** (98 forward + 4 rollback under `migrations/rollback/`) |
| Source files (`src/`) | **328** (234 `.ts` + 94 `.tsx`) |
| Test/spec source files | **383** in the current repository scan |
| Custom hooks (`src/`) | **23** (`use*.ts*`) |
| Orchestrator tracked files | **~130** excluding `__pycache__` |

## Latest Verified Git History

```text
d22ddcf fix(omnidash): surface alignment + glassmorphism repair pass (#1529)
26bbf7f fix(omnidash): increase left/right rail widget opacity by 25%
edea8b4 docs: sync omni-recall/README/registry to merged PR #1525 + #1527 state
0a2919e fix(omnidash): footer data honesty — drop mislabelled FlowBills KPIs (reviewer item 4)
bbc5e15 Merge pull request #1527 from apexbusiness-systems/codex/fix-claim-hygiene-failure-in-apex-omnihub
7934455 fix(ci): remove unapproved omnidash latency claim
9a318fa Fix OmniDash layout duplicate root selector
b780c98 Repair OSE governance drift
331e997 fix(omnidash): relocate rail-width/pad-x CSS to the actually-loaded stylesheet
922e4fa fix(omnidash): logo below App Gallery, exact KPI/status width parity, footer-fixed proof + CI integrity & migration-history remediation
6676d42 fix(omnidash): P1 regression repair — observability footer-only, System Health restored
7c5eda9 feat(omnidash): Sidebar KPI bar, layout restoration, language switcher (#1516)
```

## Current Truth Summary

- Release line and root `package.json` are **1.8.3**; README and current docs must not continue to state `1.8.2`.
- App package remains **1.3.10**.
- The latest local audited baseline is **`d22ddcf`**, not `fba4e2f`; the recent sequence includes OmniDash surface alignment/glassmorphism repair, rail opacity, claim-hygiene cleanup, OSE governance drift repair, and PR #1516 layout/sidebar/mobile enhancements.
- Full production certification remains **not established by this documentation pass**. Repo-level evidence can support release readiness, but live/owner validation is still required wherever `docs/release/release-validation-matrix.json` records `BLOCKED` or `REQUIRES_MANUAL_VALIDATION`.
- Canonical live OmniHub app paths remain `apps/omnihub-site/` and `apps/omnihub-site/dashboard/`; avoid `src/components/dashboard/` for OmniDash production remediation unless a current import trace proves it is live.

## Documentation Sync Scope (2026-07-04)

This pass updates README-cited living documents and adds this dated current-state snapshot. Older dated release notes and historical audits remain historical evidence; they must not be reinterpreted as current production proof.

## Validation Commands Used

```bash
git fetch --all --prune
git log --oneline --decorate --max-count=25
node -p "require('./package.json').version"
node -p "require('./apps/omnihub-site/package.json').version"
find supabase/functions -mindepth 1 -maxdepth 1 -type d | wc -l
find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name _shared | wc -l
find supabase/migrations -type f -name '*.sql' | wc -l
find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) | wc -l
find tests app orchestrator packages apps src -type f \( -name '*.spec.*' -o -name '*.test.*' \) 2>/dev/null | wc -l
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l
find src -type f -name '*.ts' | wc -l
find src -type f -name '*.tsx' | wc -l
find src -type f -name 'use*.ts*' | wc -l
git ls-files orchestrator | grep -v '__pycache__' | wc -l
```
