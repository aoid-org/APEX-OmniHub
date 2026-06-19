# Web Vitals Fix — 2026-06-19

Context: Field data showed INP needs-improvement on `#platform-map .ohsm-btn-primary` and poor CLS on `#maestro` / platform map surfaces.

Decision:
- Reserve the platform map host before `/omnihub-starmap.js` mounts using `.omnihub-platform-map-host` with `min-height: clamp(520px, 72vh, 820px)`, layout/paint containment, `content-visibility: auto`, and intrinsic size.
- Mirror stable minimum height in the injected `.ohsm-section` so the mounted section does not collapse or reflow its host.
- Defer starmap overlay construction from the primary CTA click handler to the next animation frame after setting immediate `aria-busy` state.
- Stabilize `maestro.html` by giving `#root` a `maestro-root-shell` class and 100vh shell, and wrap the React Maestro route in `[data-page="maestro"].maestro-page` with stable min-height/containment.

Validation added:
- `tests/omnidash/platform-map-web-vitals.test.tsx` covers platform map reservation, deferred starmap CTA work, and Maestro shell stabilization.

Caveat:
- CrUX recovery must be checked after the 28-day field-data window; local/code validation cannot prove immediate field recovery.
