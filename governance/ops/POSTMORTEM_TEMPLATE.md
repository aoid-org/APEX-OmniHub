# Postmortem: <Incident Title>

Incident ID: INC-YYYY-NNNN
Severity: SEV1 | SEV2 | SEV3
Date detected: <YYYY-MM-DD HH:MM TZ>
Duration: <HH:MM>
Author: <Name>
Reviewers: <Architecture / Security / Domain Owner>
Status: Draft | Published | Action Items Closed

---

## Summary

Two-sentence plain-English description of what happened and what the user experienced.

## User Impact

- affected users: count or percentage
- affected workflows
- data loss: none | partial | full + scope
- monetary impact (estimate)
- regulatory impact

## Timeline (UTC)

| Time | Event | Actor |
|---|---|---|
| 14:02 | First customer report | support |
| 14:04 | Alert fired (`apex_broadcast_errors_total`) | monitoring |
| 14:07 | On-call acked | jane@ |
| 14:11 | Rollback initiated | jane@ |
| 14:19 | Service restored | jane@ |
| 14:25 | Status page updated | comms |

## Root Cause

The actual cause. Not the trigger. Five Whys minimum.

## Contributing Factors

- factor 1
- factor 2

## What Went Well

- detection time
- rollback ran cleanly
- on-call playbook accurate

## What Went Poorly

- alert routing was wrong
- runbook was stale
- no canary caught the regression

## Detection

- how was it detected (alert / customer / internal)?
- could it have been detected earlier? what would have triggered?

## Resolution

What stopped the bleeding.

## Action Items

| ID | Action | Owner | Severity | Due | Status |
|---|---|---|---|---|---|
| AI-1 | Add chaos test for failover path | @owner | P0 | YYYY-MM-DD | open |
| AI-2 | Tighten alert threshold | @owner | P1 | YYYY-MM-DD | open |
| AI-3 | Postmortem reviewed at all-hands | @ic | P2 | YYYY-MM-DD | open |

## Doctrine Reflection

- which APEX principle was violated?
- was god-object / hidden coupling / missing rollback / missing observability involved?
- what doctrine update or governance addition (if any) is required?

## Approval

Author: <Name / Date>
Architecture Reviewer: <Name / Date>
Operations Reviewer: <Name / Date>
