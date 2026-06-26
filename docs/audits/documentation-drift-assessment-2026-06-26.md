# Documentation Drift Assessment — 2026-06-26

## Decision

**VERIFIED for repo-documentation alignment in this pass. BLOCKED for live-production certification.**

This assessment started with `.understand-anything/` and `memory/omni-recall/`, then reconciled living entry-point docs with current repo evidence. Historical dated audits/certifications were not rewritten; current docs supersede them forward.

## Scope reviewed

- `.understand-anything/E2E_CANONICAL_BEHAVIOR.md`
- `.understand-anything/graph-meta.json`
- `.understand-anything/tmp/ua-scan-results.json`
- `README.md`
- `docs/APEX_AGENT_OPERATIONS.md`
- `docs/release/release-validation-matrix.json`
- `memory/omni-recall/docs/README.md`
- `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_26.md`
- `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md`
- Recent omni-recall notes for production audit, remediation, and ops-doc drift guard repair

## Repo evidence checked

| Fact | Current value | Evidence command |
|---|---:|---|
| Workflow files | 20 | `find .github/workflows -maxdepth 1 -type f` |
| `src` TypeScript/TSX files | 328 (234 `.ts` + 94 `.tsx`) | `find src -type f -name '*.ts'`; `find src -type f -name '*.tsx'` |
| Supabase function directories | 34 (33 functions + `_shared`) | `find supabase/functions -mindepth 1 -maxdepth 1 -type d` |
| SQL migrations | 100 (96 forward + 4 rollback) | `find supabase/migrations -type f -name '*.sql'`; `find supabase/migrations/rollback -type f -name '*.sql'` |
| Spec/test source files | 385 | `find tests e2e sim apps orchestrator packages ...` |
| Current remediation baseline | `fba4e2f` | `git log -1 --pretty='%h %s'` before this doc sync |

## Updates made

- Updated `README.md` to point at the 2026-06-26 platform state, correct function/test counts, and route release evidence to the validation matrix.
- Updated `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_26.md` with the release-remediation baseline, fail-closed env contract, local-launch truthfulness, branch-only dependency automation, and manual/live validation boundary.
- Updated `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` to version 1.8.0 with 2026-06-26 current facts and a doc-sync changelog.
- Updated `memory/omni-recall/docs/README.md` to point at the 2026-06-26 snapshot and validation matrix instead of the stale 2026-06-24 owner-certification pointer.
- Extended `.understand-anything/E2E_CANONICAL_BEHAVIOR.md` with repo-evidence vs live-proof doctrine and OmniDash local-launch truthfulness.

## Remaining non-repo validation gaps

The following remain **not verified by this documentation pass** and must stay `BLOCKED` or `REQUIRES_MANUAL_VALIDATION` until real evidence exists:

- GitHub Actions current status and branch-protection settings.
- Cloudflare deployed bundle and production/staging environment variables.
- Supabase production/staging migration state and RLS tenant-isolation behavior.
- Real OAuth provider callbacks and persisted connector read-back.
- Billing sandbox transitions.
- BYOM provider calls, key storage, and error handling.
- Native Android/iOS builds on target devices/emulators.
- WebAuthn/FaceID/TouchID real-device flows.

## Validation to run after this doc sync

- `npm run docs:check`
- `npm run check:release-certification-docs`
- `npm run verify:claim-hygiene`
- `npm run release:validation-matrix`
- `npm run verify:ci-integrity`
- `node scripts/ci/check-ops-doc-drift.mjs`
