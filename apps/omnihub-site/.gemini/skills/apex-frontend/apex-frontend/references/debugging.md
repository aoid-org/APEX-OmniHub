# Debugging Field Manual (UI bugs)

## Classify quickly
- Layout/constraints: clipping, overflow, misalignment
- State/race: flicker, wrong data shown, duplicate requests
- Rendering/perf: jank, dropped frames
- Data/API: incorrect payloads, parsing issues
- Platform-specific: OS version/device quirks
- Tooling/build: bundler, dependency mismatch

## Minimal reproduction tactics
- Remove unrelated components
- Replace data with a constant
- Freeze time/network (mock)
- Bisect recent changes

## Logging boundaries (high signal)
Log at boundaries only:
- User event
- State transition
- Effect start/end
- Render counts (spot re-render storms)
- Network request/response summary (no secrets)

## Root-cause patterns
- Infinite re-render: state update in render/effect dependency loop
- Layout jump: missing constraints, async image sizing, font loading
- Ghost taps: overlapping views, pointer-events mis-set
- Stale data: caching key bug, missing dependency, race condition
- “Works on my device”: feature flags, locale, permission differences

## Prevention catalog
- Add invariants (assert impossible states)
- Add component tests for states
- Add lint rules (hook deps, exhaustive deps)
- Add monitoring events for known failure modes
