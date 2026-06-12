---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# RFC Usage Policy

## RFC Required

An RFC is required for any change that:
- adds a new product capability
- changes domain boundaries
- introduces a new service, worker, queue, API, database table, or AI agent
- changes authorization, payments, PII, or audit behavior
- impacts scalability, resiliency, deployment, or rollback
- adds cross-domain communication
- changes production operations

## RFC Not Required

An RFC is not required for:
- typo fixes
- isolated UI copy changes
- test-only changes
- documentation-only changes that do not alter policy
- dependency patch updates with no behavior change

## Rejection Rule

Missing required RFC sections means rejection.

## Approval Rule

A PR requiring an RFC may not merge until:
- RFC is approved
- architecture review is approved
- CI policy gates pass
- rollback path is defined
- ownership boundary is clear
