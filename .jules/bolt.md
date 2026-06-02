## 2026-02-16 - O(N) array search inside object traversal is a major bottleneck
**Learning:** Checking for substrings across an array of terms (`SENSITIVE_FIELD_NAMES.some(term => key.includes(term))`) is extremely slow, especially when executed inside a deep recursive sanitization loop that checks every single object key.
**Action:** Use a pre-compiled Regular Expression (`new RegExp(terms.join('|'), 'i')`) instead. This provides an O(1) lookup in V8 and significantly reduces recursive overhead. Path alias (`@/`) imports in vitest/bun test can be tricky without proper config, but do not override them just to test a unit file locally as they break repo standards.
## 2026-05-15 - Replaced O(N²) loop with O(N) lookup in DashboardOverview.tsx\n**Learning:** The useMemo hook mapping defaultApps and searching inside integrationsQuery.data was an O(N*M) bottleneck.\n**Action:** Use a JavaScript Map (integrationsMap) for O(1) lookups inside the iteration, effectively reducing complexity to O(N+M).
## YYYY-MM-DD - WorkflowBuilder Canvas Drag Optimization
**Learning:** High-polling mice (e.g. 1000Hz) trigger `onMouseMove` excessively in React, which can flood the render queue and cause visual lag during SVG node drags. Standard debouncing/throttling might skip important final coordinate updates or stutter.
**Action:** Always use `requestAnimationFrame` for high-frequency interactive canvas/SVG state updates (e.g. node dragging), tracking the `latestPosRef` and clearing the frame loop when interaction ceases, to perfectly sync with the browser refresh rate (~60 FPS).
## 2026-05-24 - Replaced O(N log N) sort with O(N) reduce for finding max string date
**Learning:** Sorting an array of date strings using `.sort().reverse()[0]` just to find the latest date introduces unnecessary O(N log N) overhead. While N might be small in certain cases, it's an inefficient pattern for finding a simple maximum.
**Action:** Use `.reduce((max, current) => (current !== null && (!max || current > max)) ? current : max, null)` for an O(N) iteration that correctly finds the maximum string value without array mutation or sorting overhead.
## 2026-06-02 - O(N) Array Search Inside Object Traversal
**Learning:** Checking for substrings across an array of terms inside object traversal is slow.
**Action:** Replaced `.some()` array iteration with a precompiled RegExp `SENSITIVE_KEYS_REGEX.test(k)` for O(1) lookups.
