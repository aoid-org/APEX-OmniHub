# Testing Doctrine

Testing exists to preserve shipping velocity by preventing uncontrolled regression.

## Required Test Types

Use as applicable:
- unit tests
- integration tests
- contract tests
- regression tests
- end-to-end workflow tests
- overload tests
- rollback tests
- security tests
- observability tests

## Test Rules

Tests must be:
- deterministic
- isolated
- reproducible
- outcome-based
- aligned to user workflows

## Minimum Coverage Standard

Every production change must test:
- expected path
- failure path
- authorization boundary where applicable
- rollback path where applicable
- contract compatibility where applicable
