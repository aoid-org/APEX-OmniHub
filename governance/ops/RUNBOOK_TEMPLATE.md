# Runbook: <Alert Name or Failure Mode>

Service: <name>
Tier: T1 | T2 | T3 | T4
Owner: <team handle>
On-call: <rotation name>
Last drill: <YYYY-MM-DD>

---

## When to use

This runbook is for: <symptom description / alert that fires>

This runbook is NOT for: <adjacent symptoms that have their own runbook>

## Severity

Default: SEV2. Escalate to SEV1 if:
- multi-tenant impact
- data loss or corruption suspected
- security or payments path affected

## Triage (≤ 5 min)

1. Confirm the alert fired against `<dashboard link>`.
2. Check upstream dependencies dashboard `<link>`.
3. Check deploy markers in the last 60 min — was anything shipped?
4. Check feature-flag changes in the last 60 min.

## Mitigate (≤ 30 min)

In priority order, try:

1. **Rollback** (if recent deploy or flag flip):
   ```
   <exact command>
   ```
   Verify: `<exact verification command>`

2. **Traffic shed** (if overload):
   ```
   <exact command>
   ```

3. **Failover** (if regional fault):
   ```
   <exact command>
   ```

4. **Circuit-breaker on dependency** (if vendor degraded):
   ```
   <exact command>
   ```

If none of the above works in 15 min, escalate to incident commander.

## Verify

- error rate returned to baseline on `<dashboard link>`
- p95 latency returned to baseline
- customer-facing test on `<endpoint>` returns 2xx

## Communicate

- update status page within 15 min of declared SEV1/SEV2
- post in `#incidents` Slack with summary
- if SEV1: notify legal + comms

## Post-incident

- file postmortem ticket
- attach this runbook execution log
- mark any stale step found here for fixing within 7 days

## Forbidden

- improvising commands during SEV1 (use the runbook; if it's wrong, fix it later)
- skipping verify step
- declaring resolved before observability confirms
