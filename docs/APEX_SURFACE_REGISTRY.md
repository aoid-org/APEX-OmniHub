# APEX Surface Registry

_Last updated: 2026-06-29_

## OmniDash Canonical Layout Law

- `SystemHealthRow` or an equivalent real system-health surface is retained on OmniDash. `SidebarKpiBar` must not be treated as a substitute for System Health.
- Observability is footer-only. It must not render in the old main dashboard canvas/M03 row.
- Footer observability/status is fixed to the shell footer, clipped to footer bounds, and immovable/non-draggable.
- Footer status must use relevant live/demo state already available to the shell, including guardian mode, demo/live mode, health, events, loop, stale-check, sync, and error state where available.
- Left and right rails must share `--omni-rail-width` at every desktop breakpoint.
- KPI/status blocks must maintain width/inset parity with the rail widgets above them.
- OmniSlate prompt input and submit action must remain visible, reachable, focusable, typeable, and test-addressable by `data-testid="omnislate-prompt-input"` and `data-testid="submit-prompt"`.
- OmniMedia must render loading, empty, error, and gallery states without an indefinite spinner, must support image/audio/video item affordances, and must preserve the dashboard glass/tile treatment.
- Logo/wordmark treatment must not obstruct content; watermark placement is decorative only and must not overlap interactive content.
- Flick-to-set behavior must be verified by a mobile gesture test before it can be claimed as working.
