# Merge Rights Policy

## Principle

Merge rights are earned through demonstrated understanding of APEX Build Doctrine.

No engineer, AI agent, contractor, or automation may merge production-impacting code without architecture review eligibility and CI policy compliance.

## Requirements For Merge Rights

A contributor must demonstrate understanding of:
- APEX Build Doctrine
- domain ownership
- no-god-object architecture
- rollback strategy
- observability standards
- RFC usage policy
- security basics
- incident response basics

## Mandatory Architecture Review Before Merge Rights

Before merge rights are granted, the contributor must complete one architecture review exercise that demonstrates ability to identify:
- god object risk
- domain boundary violation
- hidden coupling
- missing rollback path
- missing observability
- unsafe AI automation
- scope creep

## Merge Rights Revocation

Merge rights may be revoked for:
- bypassing CI gates
- merging without required RFC
- introducing undocumented coupling
- introducing unobservable production behavior
- bypassing rollback safety
- ignoring architecture review blockers
- repeated regression introduction

## AI Agent Merge Rule

AI agents may generate code, tests, RFCs, and reviews.
AI agents may not self-approve production merges.
Human approval remains mandatory unless explicitly replaced by a documented governance automation.
