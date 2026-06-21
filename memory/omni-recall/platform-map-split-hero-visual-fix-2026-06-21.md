---
date: 2026-06-21
status: verified
scope: PR #1454 platform map split hero
---

# Platform Map Split Hero Visual Fix

## Context

PR #1454 needed a deterministic split hero where the platform copy stays on the left and the 3D artifact is visibly restored inside a right-side `.ohsm-stage-3d` canvas host.

## Finding

The split DOM and CSS reservation existed, but visual verification showed the right stage still rendered as a subtle glow/starfield because the hero 3D frame loop stopped on the CatmullRom spine edge case at progress `0`, leaving only the CSS background visible.

## Fix

- Keep `canvas.ohsm-hero-3d` nested inside `.ohsm-stage-3d`.
- Center the mini-map in a dedicated Three.js `heroRoot` group.
- Add visible orbital rings and a core beacon so the artifact reads as a 3D map rather than hidden dots.
- Clamp scout path progress away from exact `0`/`1` (`0.001..0.999`) to avoid the r128 CatmullRom endpoint failure.

## Verification

- Screenshots captured after the fix:
  - `artifacts/pr-1454-platform-map-v2/desktop-1440x900.png`
  - `artifacts/pr-1454-platform-map-v2/tablet-1024x768.png`
  - `artifacts/pr-1454-platform-map-v2/mobile-390x844.png`
- Automated checks:
  - `npm run test -- tests/omnidash/platform-map-web-vitals.test.tsx`
  - `npx playwright test tests/e2e-playwright/platform-map-split-hero.spec.ts --project=chromium`
  - `npm run build`
