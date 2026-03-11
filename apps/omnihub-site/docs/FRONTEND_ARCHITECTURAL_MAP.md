# FRONTEND_ARCHITECTURAL_MAP

- **Document ID:** APEX-FE-MAP-2026-03-11
- **Version:** 1.0.0
- **Effective Date (UTC):** 2026-03-11
- **Repository:** `APEX-OmniHub`
- **Workspace:** `apps/omnihub-site`
- **Owner:** APEX Staff Engineering

## 1) Purpose

Define canonical frontend ownership for OmniDash, OmniBoard, OmniMedia, OmniModal, and OmniSpatialHost. This map is authoritative for routing, state, and runtime composition decisions.

## 2) Runtime Entry and Route Ownership

### Top-level app routing
- **File:** `apps/omnihub-site/src/App.tsx`
- **Canonical OmniDash root route:** `/omnidash`
- **Legacy aliases redirected into root:** `/dashboard`, `/skill-forge`
- **Global analytics mount:** `@vercel/analytics/react` (`<Analytics />`)

### OmniDash shell
- **Primary layout implementation:** `apps/omnihub-site/src/layouts/OmniDash-new.jsx`
- **Compatibility layout surface:** `apps/omnihub-site/src/layouts/OmniDashLayout.tsx`
- **Nested SPA modal route example:** `/omnidash/skill-forge`

## 3) State Ownership Map

### OmniModal state
- **File:** `apps/omnihub-site/src/stores/omniModalStore.ts`
- **Responsibility:** active modal lifecycle, validation boundary, render-mode resolution
- **Render-mode contract:** `dialog | spatial | sandbox | toast`

### OmniMedia state
- **File:** `apps/omnihub-site/src/stores/omniMediaStore.ts`
- **Responsibility:** current media payload, play state, dock state, volume

### OmniBoard state (shared root)
- **File:** `src/stores/omniBoardStore.ts`
- **Responsibility:** integration hydration and active app mount transitions

## 4) Runtime Composition Map

### OmniDash shell composition
- `DashboardOverview` (core center content)
- `OmniCanvas` (spatial widget/window layer)
- `OmniSpatialHost` (dialog/spatial/sandbox modal renderer)
- `GlobalMediaDock` (persistent PiP media surface)

### Dispatch / intent layer
- **File:** `src/omnidash/useOmniDashAction.ts`
- **Responsibility:** intent normalization, modal directive resolution, OmniBoard hydration/mount actions

## 5) Integration Contract Summary

1. **Navigation-only internal apps** → route navigation.
2. **Partial connectors** → OmniModal OAuth path.
3. **Spatial app types (`media|editor|terminal`)** → OmniSpatial render mode.
4. **Microfrontend apps (`entryUrl`)** → sandbox mode.

## 6) Known Technical Debt

- Dual-surface module ownership remains (root `src/` + app-local `apps/omnihub-site/src/`).
- Full migration to a single bounded context under `features/omnidash` is pending.

## 7) Changelog

### 1.0.0 — 2026-03-11
- Introduced canonical frontend architecture map.
- Locked route/state/runtime ownership for OmniDash + OmniModal + OmniSpatial + OmniMedia.
