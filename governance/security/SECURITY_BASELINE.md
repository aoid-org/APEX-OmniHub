---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Security Baseline

## Required Standards

All systems must:
- default deny access
- enforce least privilege
- validate all inputs
- sanitize all outputs
- isolate secrets
- encrypt sensitive data where required
- audit sensitive actions
- support revocation

## Forbidden

Never:
- hardcode secrets
- trust client-side validation alone
- bypass authorization for convenience
- expose internal contracts publicly without review
- store sensitive data without classification
- skip audit logging for privileged actions

## Required CI Security Gates

- secret scanning
- dependency vulnerability scanning
- static analysis
- auth-sensitive code review
