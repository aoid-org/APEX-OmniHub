# Canonical State Record - 2026-07-17 (PR #1641 OmniBoard Integration Runtime Merge)

Authoritative snapshot of repo state after PR #1641 (OmniBoard Integration Runtime) and PR #1642 (Tech Debt Closeout Audits) were squash-merged into `main`. Code and local gate runs are the source of truth.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File | Canonical behavior after PR #1641 merge |
|---|---|---|
| OmniBoard Integration Runtime | `apps/omnihub-site/src/pages/omnidash/OmniBoard.tsx` | Full dedicated OmniBoard page with `IntegrationOnboarder` for custom non-catalog connectors, ConnectorKit API-key generation + persistence, and Cloudflare status probe wired to `OmniLinkStatusBadge`. |
| IntegrationOnboarder | `apps/omnihub-site/src/components/omnibridge/IntegrationOnboarder.tsx` | Dynamic third-party connector onboarding flow: URL input → SSRF-validated probe → session persistence via `omnilink_integrations` Supabase table. |
| ConnectorKit | `apps/omnihub-site/src/components/ConnectorKit.tsx` | API-key generation scaffold; key stored to `integration_api_keys` via Edge Function; key prefix returned to UI; test-connection round-trip included. |
| OmniLink API (omnihub-site scope) | `apps/omnihub-site/src/omnidash/omnilink-api.ts` | Thin Vite-scoped API layer over `omnilink_integrations`; `fetchUserIntegrations` + `upsertIntegration`. 100% unit test coverage enforced via `tests/omnidash/omnilink-api.spec.ts` (5/5 passing). |
| AppTile | `apps/omnihub-site/src/components/AppTile.tsx` | App tile component for APEX-ecosystem app gallery in OmniDash. |
| SonarCloud CPD Exclusions | `sonar-project.properties` | `sonar.cpd.exclusions` updated with exact file paths for all 4 CPD-flagged UI mirror components (`ConnectorKit.tsx`, `IntegrationOnboarder.tsx` ×2, `AppTile.tsx`) to eliminate false-positive duplication violations. |

## 2. Verified Statistics & Reference
- **Release Line:** `1.8.3` (`package.json`), App `1.3.10`.
- **HEAD on main:** `5c991065` (PR #1642 merge commit).
- **PR #1641 commit:** `5dd33caf` (OmniBoard Integration Runtime — squash-merged 2026-07-17).
- **PR #1642 commit:** `5c991065` (Tech debt closeout audits & PR lock registries — squash-merged 2026-07-17).
- **Source files (`src/`):** 233 `.ts` + 88 `.tsx` = **321 total** (git-verified 2026-07-17).
- **SQL Migrations:** **108** `.sql` files (2 new added in PR #1641 for `omnilink_integrations` and `integration_api_keys`).
- **Edge Function dirs:** **35** (34 functions + `_shared`).
- **CI/CD Workflows:** **22**.
- **Test Matrix Status:** `npm run check:omnidash` → 43/43 PASS. `tests/omnidash/omnilink-api.spec.ts` → 5/5 PASS. `tsc -b --noEmit` → exit 0. `eslint .` → exit 0. `check:react` → React singleton 18.3.1 confirmed.
- **Primary Canonical Reference:** See `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` (updated in this pass).

## 3. Post-Merge Documentation Sync (2026-07-17)

| File | Change |
|---|---|
| `README.md` | version `1.3.6`→`1.3.7`; `last_audited` `2026-07-16`→`2026-07-17`; HEAD note → `5c991065`; migration count `106`→`108`; tsx count `87`→`88`, ts `234`→`233`; canonical state link → `CANONICAL_STATE_2026-07-17.md`. |
| `.understand-anything/CANONICAL_STATE_2026-07-17.md` | **NEW** — this file; authoritative post-PR #1641 state snapshot. |
| `.understand-anything/CANONICAL_STATE_2026-07-16.md` | PR #1641 status updated from `(Open)` to `(Merged)`. |
| `memory/omni-recall/start-here.md` | 2026-07-17 session block appended. |
| `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` | Section 6 updated: PR #1641 and PR #1642 marked as Merged with commit hashes. |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | Facts table updated (migration count, tsx count, HEAD); 2026-07-17 sync section added. |
