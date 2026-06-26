# APEX-OmniHub Accepted Findings Registry

This registry tracks findings, defects, or deviations that have been formally accepted by the APEX governance team and deferred to a specific future ticket, ensuring they are not lost or silently ignored.

## Phase 6 G6: Accepted Deferrals

### Performance
* **Finding:** k6 performance tests fail to meet the strict APEX standard.
* **Metric:** `p99 < 800ms`
* **Status:** `SOFT / main-only`
* **Verdict:** ACCEPTED-DEFERRED
* **Ticket:** APEX-1202
* **Notes:** Deferred pending a dedicated performance tuning pass. The soft gate remains in place on main branch to collect data without blocking feature delivery until the pass is complete.
