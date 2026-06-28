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

### Links Module Fallback

* **Finding:** Links dialog renders a generic module view, not an add-link form; `omnilink-port` wiring needed for full link-sync functionality.
* **Metric:** Module renders honest "unavailable" state when sync backend unreachable.
* **Status:** `SOFT / non-blocking`
* **Verdict:** ACCEPTED-DEFERRED
* **Ticket:** APEX-2011
* **Notes:** Links fallback UI shows honest empty state. Full link-sync wiring deferred until `omnilink-port` link routes are implemented. E2E spec `cp-11-modal-matrix` skips the Links assertion with a tracker referencing this ticket.
