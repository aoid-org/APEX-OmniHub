# Performance Playbook

## Failures (❌)
- Optimizing without measuring.
- Rendering everything (lists/images).

## Correct Pattern (✅)
Budget → Profile → Hot path → Fix → Re-measure → Regression lock.

## Fix order
Reduce work (memoize/virtualize) → reduce overdraw → reduce payload → reduce sync waits.
