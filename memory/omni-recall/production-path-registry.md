---
title: Production Path Registry
created: 2026-06-28
status: active
workflow: omnidev-apex-pro-v2
source_of_truth: memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md
rule: Live app renders from apps/omnihub-site/ (NOT src/). Verify a path with the file tool before editing.
---

# Production Path Registry

Canonical live paths for APEX-OmniHub remediation. `[EXISTS]` verified 2026-06-28;
`[NET-NEW]` to be created by the cited phase. Editing ghost paths (`src/components/dashboard/`
for OmniDash work) is an automatic NO-GO — re-resolve to `apps/omnihub-site/dashboard/`.

## Shells & hosts

| Layer | Path | Status |
|---|---|---|
| OmniDash shell | `apps/omnihub-site/dashboard/OmniDashShell.tsx` | [EXISTS] |
| Modal host (sole chrome owner) | `apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx` | [EXISTS] |
| Module renderer (moduleKey→component) | `apps/omnihub-site/dashboard/components/ModuleRenderer.tsx` | [EXISTS] |
| Module key registry | `apps/omnihub-site/dashboard/components/moduleComponents.ts` | [EXISTS] |
| Top bar / language switcher | `apps/omnihub-site/src/components/Layout.tsx` | [EXISTS] |

## Surface ownership & contracts

| Layer | Path | Status |
|---|---|---|
| Integration ownership (legacy → deprecated shim) | `apps/omnihub-site/dashboard/contracts/appIntegrationOwnership.ts` | [EXISTS] re-exports canon (P1 ✓) |
| Surface ownership canon (two-owner) | `apps/omnihub-site/dashboard/contracts/omniSurfaceOwnership.ts` (+ `.test.ts`) | [EXISTS] P1 ✓ |
| APEX Apps contract | `apps/omnihub-site/dashboard/contracts/apexApps.ts` | [EXISTS] inspect P3 |
| Module action capabilities | `apps/omnihub-site/dashboard/contracts/moduleActionCapabilities.ts` | [EXISTS] |

## Modules

| Layer | Path | Status |
|---|---|---|
| OmniBoard wizard (3rd-party only) | `apps/omnihub-site/dashboard/components/OmniBoardWizard.tsx` | [EXISTS] |
| Files module (upload entry) | `apps/omnihub-site/dashboard/components/modules/FilesModule.tsx` | [EXISTS] ingest P8 |
| APEX Apps MCP module (prompt-first, OmniPort handoff) | `apps/omnihub-site/dashboard/components/modules/ApexAppsMcpModule.tsx` | [EXISTS] P1 ✓ |

## OmniMedia

| Layer | Path | Status |
|---|---|---|
| Launch widget | `apps/omnihub-site/dashboard/components/media/OmniMediaLaunchWidget.tsx` | [EXISTS] demo-only |
| Player | `apps/omnihub-site/dashboard/components/media/OmniMediaPlayer.tsx` | [EXISTS] |
| Gallery (catalog-backed) | `apps/omnihub-site/dashboard/components/media/OmniMediaGallery.tsx` | [NET-NEW] P9 |
| Store | `apps/omnihub-site/src/stores/omniMediaStore.ts` | UNCERTAIN:[verify P9] |

## Drag/drop & layout

| Layer | Path | Status |
|---|---|---|
| Draggable widget | `apps/omnihub-site/dashboard/DraggableWidget.tsx` | [EXISTS] rewrite P10 |
| Layout persistence hook | `apps/omnihub-site/dashboard/.../useLayoutPersistence.ts` | [EXISTS] |
| Collision/clamp resolver + tests | `apps/omnihub-site/dashboard/lib/widgetLayout.ts` (+ `.test.ts`) | [NET-NEW] P10 |
| Layout storage key | `omnidash_layout_v2:{userId}:{breakpoint}` | [NET-NEW] P10 (migrate `omni_widget_pos_*`) |

## i18n

| Layer | Path | Status |
|---|---|---|
| i18n init | `apps/omnihub-site/src/i18n/index.ts` | [EXISTS] |
| Locales (9) | `apps/omnihub-site/src/i18n/locales.ts` | [EXISTS] |
| Persisted key | `localStorage apex_locale` | [EXISTS] |

## Backend / Supabase

| Layer | Path | Status |
|---|---|---|
| Edge router | `supabase/functions/omnilink-port/index.ts` | [EXISTS] extend P5/P7 |
| Shared CORS/preflight | `supabase/functions/_shared/cors.ts` | [EXISTS] |
| Migrations (additive only) | `supabase/migrations/` | [EXISTS] |
| omnihub-files bucket migration | `supabase/migrations/20260531000002_create_omnihub_files_bucket.sql` | [EXISTS] |
| `public.omnimedia_assets` (RLS + owner_user_id) | `supabase/migrations/` (new additive) | [NET-NEW] P7 |
| Private `omnimedia-assets` bucket + policies | `supabase/migrations/` (new additive) | [NET-NEW] P7 |
| Edge routes: omnimedia-catalog / -ingest-from-upload / -register-external / -delete-asset | `omnilink-port/index.ts` | [NET-NEW] P7 |
| Project ref | `supabase/config.toml:1` → `rtopreovkywofgwgmozi` | [EXISTS] |

## Tests, CI & artifacts

| Layer | Path | Status |
|---|---|---|
| E2E suite | `tests/e2e-playwright/` | [EXISTS] |
| Global auth setup | `tests/e2e-playwright/global-setup.ts` | [EXISTS] |
| Auth helper | `tests/e2e-playwright/helpers/auth.ts` | [EXISTS] |
| Modal contract spec | `tests/e2e-playwright/omnidash-modal-contract.spec.ts` | [EXISTS] P2 ✓ |
| CI runtime gates | `.github/workflows/ci-runtime-gates.yml` | [EXISTS] rewire k6 P14/15 |
| k6 smoke script (repo-owned) | `scripts/ci/perf-k6-smoke.mjs` (`npm run perf:k6:smoke`) | [EXISTS] wire into CI P14/15 |
| Perf evidence artifact | `artifacts/production-validation/performance-summary.json` | [NET-NEW] P14/15 |
| Accepted findings registry | `accepted-findings.md` | [EXISTS] expand P14 |

## Canon & memory

| Layer | Path | Status |
|---|---|---|
| Canonical truth | `memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md` | [EXISTS] |
| Remediation baseline | `memory/omni-recall/production-surface-remediation-baseline.md` | [EXISTS] P0 |
| This path registry | `memory/omni-recall/production-path-registry.md` | [EXISTS] P0 |
| Repo instructions | `AGENTS.md` (25 sections, frontmatter v2.0.2) | [EXISTS] |
| Core protocols / skill routing | `CLAUDE.md` (reconciled to omnidev-apex-pro-v2 on 2026-06-28) | [EXISTS] |
