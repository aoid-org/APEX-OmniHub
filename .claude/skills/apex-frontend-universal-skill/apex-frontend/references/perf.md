# PERF Protocol (Universal)

1) Define budget (startup, scroll, memory, network)
2) Profile to find hot path
3) Fix in order:
   - Reduce work (memoize, virtualize, split)
   - Reduce overdraw (effects/layers)
   - Reduce payload (images, bundles)
   - Reduce sync waits (async IO, debounce, cancel)
4) Re-measure and add regression guards
