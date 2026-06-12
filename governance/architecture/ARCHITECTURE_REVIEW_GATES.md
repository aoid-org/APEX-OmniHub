---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Architecture Review Gates

## Hard Blockers

Reject immediately if the change introduces:
- god object patterns
- shared mutable state across domains
- hidden global state
- circular dependencies
- cross-domain database writes
- undocumented contracts
- unclear ownership
- missing rollback path
- missing observability
- direct dependency on implementation details from another domain
- AI automation without permission boundary or audit trail

## Required Checks

Before approval, verify:
- exact user is identified
- workflow improvement is measurable
- domain ownership is explicit
- data flow is documented
- contracts are typed and documented
- failure modes are documented
- rollback strategy is tested or executable
- logs, metrics, tracing, and audit events are defined
- security impact is reviewed
- performance and overload impact is reviewed
- scope boundaries are explicit

## Architecture Decision Rule

When in doubt, choose the option that maximizes:
- maintainability
- reversibility
- observability
- domain isolation
- user simplicity

Do not choose the option that only maximizes short-term implementation speed.
