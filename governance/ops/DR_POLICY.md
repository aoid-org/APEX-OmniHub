---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Disaster Recovery Policy

Version: 1.0.0
Owner: Architecture + Operations
Applies To: every T1 and T2 data store and stateful service

---

## Targets by Tier

| Tier | RPO (max data loss) | RTO (max recovery time) |
|---|---|---|
| T1 | ≤ 5 minutes | ≤ 1 hour |
| T2 | ≤ 1 hour | ≤ 4 hours |
| T3 | ≤ 24 hours | ≤ 24 hours |
| T4 | best effort | best effort |

## Required Per Stateful Service

- declared backup strategy (continuous WAL, snapshot frequency)
- declared backup destination (geographically separate region)
- declared encryption at rest for backups
- declared restore procedure documented in runbook
- declared restore drill cadence

## Restore Drills

- T1: quarterly, full restore to isolated environment, end-to-end validation
- T2: semi-annually
- T3: annually

Drill failure is a SEV2 incident.

## Required Drill Evidence

- runbook executed step-by-step
- timing recorded (ack → restore initiated → data verified → service responding)
- gap report against RPO/RTO targets
- remediation actions for any gap

## Failure Domain Isolation

- Multi-region for T1 stateless services.
- Multi-AZ minimum for all T1 and T2.
- No single point of failure in T1 critical path (auth, payments, broadcast control).

## Data Integrity Verification

- backups are restore-tested, not just successfully written
- backup retention matches retention class (see `COST_BUDGET_POLICY.md`)
- backup tampering monitored (object-lock or equivalent for compliance data)

## Forbidden

- "we have backups" without a verified restore drill in the last 12 months
- T1 data store with single-region backups
- backups stored in the same account/credentials as the primary
