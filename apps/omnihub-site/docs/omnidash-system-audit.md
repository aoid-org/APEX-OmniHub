# OmniDash System Audit

- **Document ID:** ODH-AUDIT-2026-03-11
- **Version:** 2.0.0
- **Effective Date (UTC):** 2026-03-11
- **Status:** Approved for implementation tracking
- **Owner:** APEX Staff Engineering

## 1) Audit Scope

This audit covers end-to-end frontend integration and runtime wiring for:

- `apps/omnihub-site/src/layouts/OmniDash-new.jsx`
- `apps/omnihub-site/src/layouts/OmniDashLayout.tsx`
- `apps/omnihub-site/src/components/omnidash/OmniCanvas.tsx`
- `apps/omnihub-site/src/components/omnidash/OmniSpatialHost.tsx`
- `apps/omnihub-site/src/components/omnidash/media/GlobalMediaDock.tsx`
- `apps/omnihub-site/src/stores/omniModalStore.ts`
- `apps/omnihub-site/src/stores/omniMediaStore.ts`
- `apps/omnihub-site/src/pages/DashboardOverview/*`
- `src/omnidash/useOmniDashAction.ts`
- `src/stores/omniBoardStore.ts`

## 2) Executive Findings

1. **OmniModal orchestration is present and deterministic** through a Zod-validated global store and render-mode decision engine (`dialog`, `spatial`, `sandbox`, `toast`).
2. **OmniSpatialHost runtime is active** and mounted in both OmniDash layouts, including spatial PiP/full modes and sandbox rendering paths.
3. **OmniMedia runtime is now app-local and shell-mounted** via `GlobalMediaDock` + `omniMediaStore`, ensuring persistent PiP media controls inside OmniDash.
4. **OmniDash dispatch logic has been aligned with current OmniBoard APIs** (`hydrateIntegration`, `mountActiveApp`) to remove stale connector-status contract usage.
5. **Type contract drift has been reduced** in DashboardOverview app status modeling (`'Live' | 'Partial'`).

## 3) Remediation Completed

- Mounted `GlobalMediaDock` in both OmniDash shell implementations.
- Added app-local media store under `apps/omnihub-site/src/stores/omniMediaStore.ts`.
- Reworked `src/omnidash/useOmniDashAction.ts` to current OmniBoard contract.
- Tightened DashboardOverview `AppEntry.status` typing and removed unsupported intent fields.
- Corrected malformed metadata header in app-local `omniModalStore`.

## 4) Remaining Structural Risks

1. **Duplicate implementation surfaces remain** between app-local and root-level Omni* modules.
2. **Bounded-context migration remains incomplete** (`features/omnidash` target architecture not fully enacted).
3. **Documentation-to-code drift risk** remains unless architectural map and audit are updated per release.

## 5) Governance / Update Policy

- Update this document on every OmniDash architecture-impacting PR.
- Bump **minor version** for additive changes; **major** for ownership/path model shifts.
- Append entries to the architectural map changelog when route/store ownership changes.
