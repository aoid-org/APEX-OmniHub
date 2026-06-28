# OmniDash P1 Stabilization Preflight — BLOCKED BEFORE IMPLEMENTATION

Date: 2026-06-28

## Branch

work

## Base commit

525191d327e2c0240ace332a011fa65e7a8f165f

## P0 dependency status

BLOCKED. Claude's P0 branch/commit was not provided in the prompt and was not identifiable as merged in the inspected current branch history. Per the execution contract, P1 implementation must not begin until the P0 base is merged, staged, or explicitly supplied.

## Baseline test commands

```bash
npm test -- tests/omnidash/omni-spatial-host.spec.tsx tests/omnidash/module-renderer.spec.tsx tests/omnidash/omni-mobile-drawer.spec.tsx tests/omnidash/omni-mobile-bottom-nav.spec.tsx tests/omnidash/dashboard-types.spec.ts tests/omnidash/omnimedia-gallery-honesty.spec.tsx tests/omnidash/omnimedia-catalog-honesty.spec.ts
npm run typecheck
```

## Baseline result

- Focused Vitest baseline: PASS — 7 files, 54 tests.
- Typecheck baseline: PASS — `tsc -b --noEmit` completed with exit code 0.

## Files inspected

- `memory/omni-recall/post-1511-omnidash-systemic-error-catalog.md`
- `apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx`
- `apps/omnihub-site/dashboard/components/ModuleRenderer.tsx`
- `apps/omnihub-site/dashboard/DraggableWidget.tsx`
- `apps/omnihub-site/dashboard/components/modules/BillingModule.tsx`
- `apps/omnihub-site/dashboard/types/dashboard.types.ts`
- `apps/omnihub-site/src/contexts/DemoModeContext.tsx` via targeted search
- `apps/omnihub-site/dashboard/hooks/useLayoutPersistence.ts` via targeted search
- `apps/omnihub-site/dashboard/components/modules/WorkflowsModule.tsx`
- OmniMedia catalog call sites via targeted search for `omnimedia-catalog`, `fetchOmniMediaCatalog`, `OmniMediaGallery`, `GlobalMediaDock`, and `OmniMediaLaunchWidget`.

## Conflict risks

- `UI-009` / `UI-010`: `OmniSpatialHost.tsx` modal layering and close ownership may be changed by P0 shell work; implementing now risks duplicate or conflicting modal semantics.
- `UI-005`: widget controls depend on final P0 surface reachability; implementing against current mounting can validate the wrong surface.
- `UI-014`: `OmniDashShell.tsx` currently derives `isDemoMode` from `ops.demo`; P0 may alter shell state ownership, so production gating should be applied on the P0-safe base.
- `UI-017`: Billing error honesty is lower conflict, but still hosted inside the modal/module contract being changed by P1 and potentially P0.
- `UI-018` / `UI-020`: can be traced now, but fixes should wait for the P0-safe base to avoid false browser/eager-fetch conclusions.

## Planned UI-IDs

Planned after P0 base is provided:

- `UI-009` modal click-outside/Escape/drag dismissal contract.
- `UI-010` duplicate close control contract.
- `UI-005` widget-level control exposure/documented unsupported controls.
- `UI-014` production `ops.demo` gating and stale persistence handling.
- `UI-017` Billing raw SDK error sanitation.
- `UI-018` Workflows unavailable/dead-action honesty if low-conflict.
- `UI-020` OmniMedia eager-fetch trace/fix/defer.

## Deferred UI-IDs

Deferred until P0 base is merged/provided:

- `UI-009`
- `UI-010`
- `UI-005`
- `UI-014`
- `UI-017`
- `UI-018`
- `UI-020`

## Implementation status

No P1 production code was changed in this preflight because the P0 dependency is missing.
