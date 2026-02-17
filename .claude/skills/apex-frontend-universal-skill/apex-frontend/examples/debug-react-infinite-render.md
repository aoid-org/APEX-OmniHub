# Example: Debug React Infinite Re-render

## Symptoms
- CPU spikes, UI freezes
- Console shows repeated renders

## Repro
1) Open Settings
2) Toggle “Enable X”
3) App becomes unresponsive

## Root cause (common)
- setState in render OR useEffect with unstable dependency.

## Patch
- Move state update into event handler
- Fix effect deps; memoize callbacks; use derived state.

## Prevention
- Add eslint exhaustive-deps
- Add unit test for reducer transition
