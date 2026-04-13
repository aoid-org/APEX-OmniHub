## 2026-04-13 - Memoizing spatial store values from Zustand
**Learning:** Zustand selectors that return iterable object methods (like `Array.from(map.values())`) run on every state change tracked by the store. In high-frequency interaction components like `OmniCanvas` (pan/zoom), this causes massive garbage collection overhead.
**Action:** Always wrap derived reference types (arrays, objects) generated from Zustand state variables in `useMemo` hooks with the state variables as dependencies, particularly in components bound to mouse/pointer movement.
