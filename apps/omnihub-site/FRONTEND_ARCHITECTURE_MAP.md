# APEX OmniHub — Frontend Architecture Map

> **Strictly Enforced Rule**: `apps/omnihub-site/` is the **sole routing environment** for the APEX OmniHub Synchronized Orchestrator (SO). Imports from the legacy root `src/` directory are **strictly forbidden**. `OmniDashLayout.tsx` is the canonical shell; `DashboardOverview.tsx` is the canonical data view.

---

## Canonical Component Hierarchy

```
apps/omnihub-site/src/
├── App.tsx                          ← SO Router (single source of truth)
├── layouts/
│   └── OmniDashLayout.tsx           ← Canonical Shell (3-column grid)
│       ├── Sidebar (left)           ← Nav icons, links, sentry status
│       ├── Center Column            ← DashboardOverview (permanent) + Outlet (modal)
│       └── Right Sidebar            ← Ops Controls, OmniTrace, Analytics, Security
├── pages/
│   ├── Home.tsx                     ← Marketing landing (apexomnihub.icu/)
│   ├── DashboardOverview.tsx        ← Canonical data view (embedded in layout)
│   ├── Login.tsx                    ← Authentication
│   └── [Feature Pages]              ← OmniPort, Maestro, Fortress, etc.
└── content/
    └── site.ts                      ← All marketing copy (single source)
```

## Rendering Architecture

| Component           | Location                      | Render Pattern                                    |
| ------------------- | ----------------------------- | ------------------------------------------------- |
| `OmniDashLayout`    | `layouts/OmniDashLayout.tsx`  | Parent shell — always mounted at `/omnidash`      |
| `DashboardOverview` | `pages/DashboardOverview.tsx` | Hardcoded inside layout center column (permanent) |
| Subroute pages      | `pages/*.tsx`                 | Rendered via `<Outlet />` inside modal overlay    |

## Routing Rules

1. `OmniDashLayout` owns the `DashboardOverview` payload directly. **No index route.**
2. All subroutes (`/omnidash/omniport`, `/omnidash/maestro`, etc.) render inside the modal `<Outlet />`.
3. Dashboard stays visible behind the modal blur when subroutes are active.

## Forbidden Patterns

- ❌ Importing from `../../src/` into `apps/omnihub-site/`
- ❌ Adding an `<Route index>` for `DashboardOverview` in `App.tsx`
- ❌ Creating duplicate layout/dashboard components in the root `src/`
- ❌ Using `OMNIDASH_FLAG` feature toggles (SO is always on)

---

**Version:** 1.0.0 | **Date:** 2026-03-01 | **Ref:** APEX System Directive Phase 5
