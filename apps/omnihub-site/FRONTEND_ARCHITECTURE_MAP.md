# APEX OmniHub — Frontend Architecture Map

> **Strictly Enforced Rule**: `apps/omnihub-site/` is the **sole routing environment** for the APEX OmniHub Synchronized Orchestrator (SO). `OmniDashShell.tsx` is the canonical shell; `DashboardOverview.tsx` is the canonical data view.
>
> **Shared Platform Layer Exception**: Root `src/stores/` and `src/omnidash/` contain platform-level Zustand stores and universal hooks that are intentionally shared across all APEX surface areas. Imports from these specific directories into `apps/omnihub-site/` are permitted and expected. Feature-specific page components, legacy UI components, and duplicate layout files from root `src/` remain forbidden.

---

## Canonical Component Hierarchy

**Last reconciled:** 2026-06-01 after PR #1274 OmniDash from-zero gap closure.

```
apps/omnihub-site/
├── dashboard/                       ← Unified Dashboard Domain
│   ├── OmniDashShell.tsx            ← Canonical Shell (unified component)
│   └── components/                  ← Consolidated OmniDash widgets
├── src/                             ← Core Site Infrastructure
│   ├── App.tsx                      ← SO Router (single source of truth)
│   ├── pages/
│   │   ├── Home.tsx                 ← Marketing landing (apexomnihub.icu/)
│   │   ├── Login.tsx                ← Authentication
│   │   └── [Feature Pages]          ← OmniPort, Maestro, Fortress, etc.
│   └── content/
│       └── site.ts                  ← All marketing copy (single source)
└── ...
```

## Rendering Architecture

| Component       | Location                      | Render Pattern                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------- |
| `OmniDashShell` | `dashboard/OmniDashShell.tsx` | Parent shell — mounted at `/omnidash`, `/omnidash/*`, `/dashboard`, and `/dashboard/*` |
| Subroute pages  | `pages/*.tsx`                 | Rendered via `<Outlet />` inside modal overlay                |

## Routing Rules

1. `OmniDashShell` is the unified layout and dashboard UI component. **No index route.**
2. All subroutes (`/omnidash/omniport`, `/omnidash/maestro`, etc.) render inside the modal `<Outlet />`.
3. Dashboard stays visible behind the modal blur when subroutes are active.

## OmniDash Universal Modal Engine

All OmniDash interaction triggers route through the Universal Modal Engine rather than ad-hoc inline `invoke()` calls.

| Surface                                 | Invocation Pattern                                       |
| --------------------------------------- | -------------------------------------------------------- |
| App tile clicks (`DashboardOverview`)   | `useOmniDashAction(navigate)` dispatch                   |
| Connector auth buttons (`Integrations`) | `useOmniDashAction()` dispatch (no navigate)             |
| Header utility buttons (Connect AI)     | `useOmniDashAction(navigate)` dispatch                   |
| Utility modals (Notifications)          | `useOmniModal.getState().invoke()` direct (non-reactive) |

**Non-Reactive Rule**: Modal state is accessed exclusively via `useOmniModal.getState().invoke()` in event handlers — never via the reactive `useOmniModal()` hook subscription in layout/shell components. This prevents ghost re-renders on modal open/close.

**OmniBoard Hydration**: After successful OAuth proxy exchange, `useOmniDashAction` upserts an `OmniBoardConnectorRecord` into `omniBoardStore`. `Integrations.tsx` subscribes to `useOmniBoard` to merge live status over stale React Query cache, giving instant UI reflection without a full refetch cycle.

## Forbidden Patterns

- ❌ Importing feature-specific pages or legacy UI from root `src/components/` or `src/pages/`
- ❌ Adding an `<Route index>` for `DashboardOverview` in `App.tsx`
- ❌ Creating duplicate layout/dashboard components in the root `src/`
- ❌ Using `OMNIDASH_FLAG` feature toggles (SO is always on)
- ❌ Inline `omniModal.invoke()` calls in layout or page components (use `useOmniDashAction` dispatch)
- ❌ Subscribing layout/shell components to modal state via reactive `useOmniModal()` hook

---

**Version:** 1.2.0 | **Date:** 2026-06-01 | **Ref:** APEX System Directive Phase 5 — Universal Modal Engine

## OmniDash UI Build Protocol (apex-frontend skill alignment)

- Treat `OmniDashShell.tsx` as immutable shell authority; feature pages extend via shell-owned modules, modals, or routed payloads only.
- Enforce design-token usage (`var(--apex-*)`) for all spacing, radius, colors, and interaction timings.
- Require interactive states for all controls (`hover`, `focus-visible`, `active`) with deterministic transition curves.
- Keep accessibility first: semantic landmarks, keyboard navigation continuity, and meaningful ARIA labels.
- For visual QA, run a single deterministic screenshot pass after layout or styling changes to prevent infinite dynamic loops.
