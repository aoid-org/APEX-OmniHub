---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# CI Policy Gates

## Required Gates

CI must block merge on:
- failing tests
- lint/type errors
- circular dependencies
- missing required RFC markers when architecture-impacting files change
- forbidden god-object naming patterns
- forbidden cross-domain imports
- missing observability markers for production services
- security scanner failure
- performance regression beyond budget
- missing rollback plan for migration or deployment changes

## Required Test Gates

- unit tests
- integration tests
- contract tests
- regression tests
- overload tests for high-load paths
- rollback tests for migrations/deployments
- observability tests for production workflows

## Required Security Gates

- secret scanning
- dependency vulnerability scanning
- static analysis
- auth-sensitive path review

## Required Performance Gates

- latency budget check
- memory budget check
- bundle size check where applicable
- database query budget check where applicable

## Required Governance Gates

- PR template completed
- architecture review label applied where required
- RFC linked where required
- CODEOWNERS approval obtained
