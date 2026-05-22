# Incident Response

## Incident Requirements

Every incident requires:
- incident owner
- timeline reconstruction
- root cause analysis
- rollback evaluation
- user impact assessment
- prevention actions
- observability review

## Severity Model

- SEV1: Critical outage, data loss, security impact, payment failure, or major user-impacting production break.
- SEV2: Significant workflow degradation or partial outage.
- SEV3: Minor issue with workaround.
- SEV4: Cosmetic or internal-only issue.

## Post-Incident Rule

Never normalize recurring failure.

Repeated incidents indicate:
- architectural weakness
- ownership failure
- observability failure
- process failure
