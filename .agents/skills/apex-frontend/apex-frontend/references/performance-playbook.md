---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Performance Playbook

## Failures (❌)
- Optimizing without measuring.
- Rendering everything (lists/images).

## Correct Pattern (✅)
Budget → Profile → Hot path → Fix → Re-measure → Regression lock.

## Fix order
Reduce work (memoize/virtualize) → reduce overdraw → reduce payload → reduce sync waits.
