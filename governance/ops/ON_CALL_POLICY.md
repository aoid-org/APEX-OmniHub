# On-Call Policy

Version: 1.0.0
Owner: Operations
Applies To: every T1 and T2 service

---

## Coverage

- T1 services: 24/7 primary + secondary, weekly rotation.
- T2 services: business-hours primary + after-hours secondary, weekly rotation.
- T3/T4: best-effort, ticket-based.

## Response SLAs

| Severity | Ack | Mitigate | Resolve | Postmortem |
|---|---|---|---|---|
| SEV1 | 5 min | 30 min (rollback, traffic shed, fallback) | 4 hours | required, ≤ 5 business days |
| SEV2 | 15 min | 2 hours | 24 hours | required, ≤ 10 business days |
| SEV3 | 4 business hours | 24 business hours | 5 business days | optional |
| SEV4 | next business day | n/a | next sprint | n/a |

## Paging Tiers

1. **Primary on-call** — first responder.
2. **Secondary** — paged if primary doesn't ack in 5 min (SEV1) or 15 min (SEV2).
3. **Domain owner** — paged on SEV1 in their domain.
4. **Incident commander** — declared on SEV1 within 15 min.

## Required for Each On-Call Shift

- runbooks for top-10 alerts per service in scope (see `RUNBOOK_TEMPLATE.md`)
- access to: deployment console, rollback command, feature-flag panel, status page
- contact tree (security, legal, PR, exec on SEV1)
- handoff doc at end of shift

## Compensation

- shifts are compensated per company policy
- excessive paging (> 3 SEV1 in a week, or > 1 alert/hour avg) triggers automatic reliability review

## Forbidden

- silent on-call (page acknowledged but no action and no handoff)
- "ride it out" of SEV1 longer than 30 min without escalation
- merging non-hotfix code during personal on-call shift
