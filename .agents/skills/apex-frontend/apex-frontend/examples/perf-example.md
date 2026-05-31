# Perf Example (condensed)

**Mode**: perf  
Issue: list scroll jank.

Measure: profiler shows frequent re-renders + huge images.
Fix: virtualization + memoize rows + resize/cache images.
Re-measure: stable frame times; add perf budget check.
