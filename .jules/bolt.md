## YYYY-MM-DD - [Concurrent Execution with Promise.all in Batch Processing]
**Learning:** Sequential batch processing (using a standard `for...of` loop with `await` on each item) introduces a massive N+1 blocking bottleneck, significantly degrading performance as the batch size increases.
**Action:** Replaced sequential execution with concurrent mapping using `Promise.all` and `Array.prototype.map`. Retained isolated error handling by placing `try/catch` blocks inside the inner async mapping function, ensuring that an error in one item doesn't short-circuit the execution for others. This should always be preferred over sequential processing for independent asynchronous tasks unless strict execution order is explicitly required.

## 2024-05-18 - [Optimizing High-Frequency React useMemo Calculations]
**Learning:** Multiple array passes (e.g. chaining `.filter()` and `.map()`) inside a `useMemo` hook on frequently updating data streams (like WebSockets or Server-Sent Events) can cause unnecessary CPU overhead and trigger frequent garbage collection due to intermediate array allocations.
**Action:** Consolidate multiple array iterations into a single O(n) `for...of` loop when calculating complex statistics from a frequently updating list in React.

## 2026-04-19 - [Replacing O(N^2) Array Filters with Maps]
**Learning:** In React components like `Integrations.tsx`, iterating over a list (M) and repeatedly calling `.filter()` on secondary arrays (K and E) inside the loop creates an O(M * (K + E)) time complexity. This causes excessive CPU overhead and blocks the main thread when these lists grow.
**Action:** Replaced the O(N^2) `.filter()` loops by grouping the secondary arrays (keys and events) into Hash Maps (`Map<string, T[]>`) beforehand using a single pass (O(K + E)). This reduced the overall mapping logic to O(M + K + E), significantly speeding up the `mapConnectorModels` utility.
## 2026-04-26 - [Memoize O(n) Array Processing in React Components]
**Learning:** Performing array iterations such as `.reduce` and `.filter` on potentially large data sources (like `tasks`, `notifications`, or `events`) directly within the render cycle causes unnecessary CPU load. If a component re-renders for other reasons, the operations are re-run on identical data.
**Action:** Wrap these operations in `useMemo` hooks. Provide the source array as the dependency (e.g., `[tasks]`). This ensures that the O(n) array passes are only executed when the source data actually changes.
