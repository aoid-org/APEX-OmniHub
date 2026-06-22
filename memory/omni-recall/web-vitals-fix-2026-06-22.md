# Web Vitals Fix — 2026-06-22 (round 2)

Context: Cloudflare Web Analytics (apexomnihub.icu) still short of 100% after the
2026-06-19 reservation work. Field/debug data:
- INP: 97% good. Offender: `#platform-map > .ohsm-inner > .ohsm-row > button.ohsm-btn.ohsm-btn-primary` at 248 ms.
- CLS: 94% good / 4% ni / 2% poor. Offenders: `#maestro` (0.137) and the Demo page `div.demo-video.demo-copy-font` (0.264).

Stack note: `apps/omnihub-site` is the served React app, built with **vite-react-ssg**
(static pre-render). HTML ships fully rendered, so most layout is present at first paint;
residual CLS comes from client-side script injection, late web-font swap, and text hydration.

## Root causes + fixes (surgical, no visual change)

1. **INP — starmap "EXPLORE THE MAP" CTA.** The click handler built the heavy
   `Overlay` DOM inside a single `requestAnimationFrame`, which runs *before* paint,
   so click→paint included the whole overlay construction.
   Fix: `scheduleStarmapWork` now does `requestAnimationFrame(() => setTimeout(work, 0))`
   — yields to the next paint, then builds the overlay in a fresh macrotask. Added an
   immediate `.ohsm-loading` button state (`opacity/cursor:progress/pointer-events:none`)
   so the first fast paint shows feedback and double-clicks are blocked.
   File: `apps/omnihub-site/public/omnihub-starmap.js`.

2. **CLS — #maestro.** `OmniHubPlatformMap` renders immediately above `#maestro`
   (Home.tsx ~L2441). Its host used `content-visibility:auto; contain-intrinsic-size:720px`;
   the fixed 720px placeholder didn't match the real rendered height, so each viewport
   re-entry re-jumped and pushed `#maestro`.
   Fix: `contain-intrinsic-size: auto 720px` — the `auto` keyword makes the browser
   remember the real size after first render, so re-entry never re-jumps.
   File: `apps/omnihub-site/src/styles/landing.css`.

3. **Text-hydration CLS (cross-cutting).** i18next defaulted to `initImmediate:true`,
   deferring init to a later tick → first paint could show keys/fallback then reflow.
   All locales are bundled inline, so set `initImmediate:false` for synchronous init
   (also correct for the SSG render path). File: `apps/omnihub-site/src/i18n/index.ts`.

## Demo-video CLS (0.264, count 1) — investigated, not over-patched
- `.demo-video__player` already reserves 16:9 via `aspect-ratio` and is SSG pre-rendered,
  so the block holds its space. Tried adding `aspect-ratio` to `.demo-video__container`
  but reverted: the container also holds the in-flow error/retry `<output>`, which a fixed
  ratio + `overflow:hidden` would clip.
- Residual cause is most likely web-font (Space Grotesk, `display=swap`) reflow of the
  SectionHeader above the block on a slow/uncached load. Not patched because the only
  zero-visual-compromise fix is a metric-matched fallback `@font-face` (size-adjust /
  ascent-override), and no measured Space Grotesk metrics exist in-repo — guessing could
  *increase* CLS. NEXT STEP if it persists past the CrUX window: generate a metric-matched
  fallback (fontaine/capsize) and prepend it to the stack in `theme.css`, keeping the real
  web font unchanged.

## Validation
- `tests/omnidash/platform-map-web-vitals.test.tsx` updated + passing (4/4).
- `tests/omnidash/translation-realness.spec.tsx` passing (7/7).
- `omnihub-starmap.js` passes `node --check`; i18n change typechecks clean.

## Caveat
CrUX is a 28-day trailing field window — local/code validation cannot prove immediate
field recovery. Re-check the Cloudflare dashboard after the window rolls.
