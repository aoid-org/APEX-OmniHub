# Example: Perf - List Jank

## Evidence
- Scroll drops frames on low-end devices
- Profiling shows expensive row re-renders

## Fixes
- Virtualize list
- Memoize row component
- Use stable keys and stable callbacks
- Avoid inline style objects in render

## Regression guard
- Add perf trace on CI (if available)
- Add render-count debug in dev
