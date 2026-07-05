# OmniDash Surface Fix Pass — Evidence Report

**Mandate:** Surgical surface alignment + glassmorphism repair for OmniDash. Patch, not rewrite.
**Branch:** `claude/omnidash-surface-alignment-fsrs31`
**Date:** 2026-07-04
**Scope:** App-Gallery brand logo, glass translucency (gallery tiles / primary cards / right-rail cards), Ops Controls card chrome, hero-row header alignment, magnetic widget snapping. No layout-law invariant changed.

---

## 1. Status per task

| Task | Result | Fix summary |
|---|---|---|
| T1 — App Gallery footer logo | **PASS** | `omnidash-canvas-logo` `<img>` now sources `IMG_APEX_WM` (APEX-OmniHub wordmark) instead of `IMG_WORDMARK` (OmniDash hexagon). One-line `src` swap; `draggable`/`style`/`aria-hidden`/wrapper untouched. Top-header logo (`top-header-logo`) and the full-canvas watermark left as-is. |
| T2a — Gallery "Awaiting" tiles | **PASS** | Removed `opacity: 0.6` from `.ose-integrated-apps-slot` (`omniSkin.css`). Element-level opacity was fading the rendered background/border, letting the canvas grid bleed through; the dashed border + tertiary label still carry the muted/awaiting feel. |
| T2b — Primary widget cards | **PASS** | `GlassCard` (`designComponents.tsx`) blur raised to `blur(20px) saturate(150%)` with the missing `WebkitBackdropFilter` prefix (Safari/iOS/PWA parity). `--omni-card`/`--omni-card-hover` made translucent in both themes (`theme.css`): light `rgba(255,255,255,0.80)` / `rgba(241,245,249,0.84)`; dark `rgba(14,22,40,0.78)` / `rgba(17,29,51,0.82)` — blur now has a translucent surface to act on. |
| T2c — Right-rail cards | **PASS** | Added `backdropFilter: blur(16px) saturate(140%)` + Webkit prefix to the `OmniSentryWidget` and `OmniMediaLaunchWidget` outer wrappers. No existing border/background/state-color values changed. |
| T3 — Ops Controls glass tile | **PASS** | `SentinelPanel` return wrapped in an outer card matching `OmniSentryWidget`'s chrome (`borderRadius:10`, `1px solid rgba(255,255,255,0.08)`, `rgba(255,255,255,0.03)`, `10px 12px`) + the T2c backdrop-filter. Inner `data-testid="rt_ops"` section, `OpsToggle` children, `useDemoMode` usage and aria-labels unchanged. No explicit width — rail column stretches it to match siblings. |
| T4 — Hero-row header alignment | **PASS** | `EcosystemWidget` header changed from `padding:"14px 16px 10px"` to the shared `AgentWidget`/`OmniSlateWidget` pattern (`height:44, padding:"0 16px", display:flex, alignItems:center`). The shared `borderBottom` divider now sits flush at 44px across Agent / OmniSlate / Ecosystem. Grid template (`minmax(0,220px) 1fr minmax(0,220px)`, `height:300`) untouched. |
| T5 — Magnetic widget snapping | **PASS** | Additive layer over the existing collision engine. `resolveAlignment(proposed, siblingRects)` + `ALIGN_THRESHOLD_PX = 10` added to `widgetLayout.ts` (pure, per-axis edge/center snap within 10px, returns proposed unchanged otherwise). Wired in `DraggableWidget.handlePointerUp` **before** `resolveCollisions` (collision-avoidance keeps final say, so a snap can never produce an overlap). Live read-only orange guide lines (`rgba(249,115,22,0.45)`) shown during drag via two reused singleton overlay divs parented to `.omni-canvas-container`, hidden on drag end. Long-press state machine, pointer-capture, `resolveCollisions`, `persistPosition`, `SNAP_GRID`, and flick-to-set logic untouched. Only the four registry-tracked top-level widgets participate; gallery "Awaiting" tiles are not in the registry, so they cannot trigger it. |

---

## 2. Health gate (real output)

- **Unit + OmniDash suites:** `vitest run` over `widgetLayout.test.ts` + the 8-spec OmniDash set + `sentinel-panel`/`omni-sentry-widget` — **112 passed (0 failed)**. New `resolveAlignment` unit block added (threshold, no-snap-out-of-range, per-axis independence, edge/center snap).
- **`npm run check:omnidash`:** 37 passed, 0 failed — Canonical Layout Law intact.
- **`npm run check:omni-skin`:** 6 passed, 0 failed — OmniSkin token hygiene intact.
- **`npm run typecheck`:** clean.
- **`eslint`** on all touched files: clean.
- **`npm run build`:** built in ~12s.

---

## 3. Constraint compliance

- No new dependencies/vendors/cost.
- `DraggableWidget.tsx`/`widgetLayout.ts` changed **only** as T5 specifies (new `resolveAlignment` + guide-line layer + the two `handlePointerUp` wiring lines; `Rect`/`ALIGN_THRESHOLD_PX` exported for the public signature).
- No widget IDs, `data-testid`s, or `hiddenWidgets` logic changed.
- T1–T4 stayed single-property/single-block edits.
- Locked layout invariants unchanged (confirmed by `check:omnidash`).
