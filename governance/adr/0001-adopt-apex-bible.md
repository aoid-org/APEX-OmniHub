# ADR: Adopt APEX Bible Governance Package

Status: Accepted
Date: 2026-05-22
Owner: APEX Business Systems LTD

## Context

APEX requires a single operating doctrine for product, engineering, AI agents, CI/CD, onboarding, and architecture governance.

## Decision

Adopt the APEX Bible Complete Package as the canonical governance layer for APEX-level builds.

## Consequences

Positive:
- Clear build standards
- Reduced architectural drift
- Mandatory rollback and observability
- Stronger onboarding
- Safer AI-assisted development

Tradeoffs:
- More upfront documentation
- More CI enforcement
- Slower approval for architecture-impacting changes

## Doctrine Alignment

This ADR enforces:
- user-first development
- no god objects
- strict domain boundaries
- CI policy gates
- architecture review before merge rights
- global AI prompt governance
