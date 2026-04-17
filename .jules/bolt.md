## YYYY-MM-DD - [Concurrent Execution with Promise.all in Batch Processing]
**Learning:** Sequential batch processing (using a standard `for...of` loop with `await` on each item) introduces a massive N+1 blocking bottleneck, significantly degrading performance as the batch size increases.
**Action:** Replaced sequential execution with concurrent mapping using `Promise.all` and `Array.prototype.map`. Retained isolated error handling by placing `try/catch` blocks inside the inner async mapping function, ensuring that an error in one item doesn't short-circuit the execution for others. This should always be preferred over sequential processing for independent asynchronous tasks unless strict execution order is explicitly required.

## 2024-05-18 - [Optimizing High-Frequency React useMemo Calculations]
**Learning:** Multiple array passes (e.g. chaining `.filter()` and `.map()`) inside a `useMemo` hook on frequently updating data streams (like WebSockets or Server-Sent Events) can cause unnecessary CPU overhead and trigger frequent garbage collection due to intermediate array allocations.
**Action:** Consolidate multiple array iterations into a single O(n) `for...of` loop when calculating complex statistics from a frequently updating list in React.
