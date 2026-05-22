# Security Incident Disclosure Policy

Version: 1.0.0
Owner: Security + Legal
Applies To: any confirmed unauthorized access, disclosure, or modification of P0 or P1 data; any successful auth-bypass; any payment-system compromise

---

## Triage Triggers

Treat as confirmed incident when ANY of:
- credential or key with production blast radius is exposed (public repo, screenshot, leaked artifact)
- evidence of unauthorized access to P0 or P1 data
- evidence of unauthorized mutation of payment, identity, or audit data
- AI agent took an unauthorized action with production blast radius
- third-party vendor notifies of breach affecting our data

## Initial Response (≤ 15 min)

1. Page security on-call.
2. Declare SEV1.
3. Convene incident commander, security lead, domain owner, legal contact.
4. Stop the bleeding: revoke credentials, rotate keys, isolate affected service, disable affected AI agent.
5. Preserve evidence: snapshot logs, snapshot affected data, freeze backups for the window.

## Communications

- internal channel: `#sec-incident-<id>` (restricted)
- status page: factual + measured; never speculate on cause
- customer notification: if P1 or P2 data confirmed exposed
- regulator notification: per jurisdiction (PIPEDA in Canada, GDPR EU, state laws US, etc.) — **legal owns timing**
- public disclosure: per contractual obligations and securities law if applicable

## Required Artifacts

- incident timeline with sources (log line IDs)
- scope determination (which records, which users, which time window)
- root cause analysis
- remediation taken (key rotation evidence, code fix, etc.)
- prevention plan
- regulatory filings (copies)
- customer notifications (templates + sent records)

## Disclosure SLAs

| Event | Notify whom | Within |
|---|---|---|
| P0 credential exposed | security lead | 15 min of detection |
| P1 data breach confirmed | leadership + legal | 1 hour |
| Regulatory notification (PIPEDA real risk of significant harm) | OPC | per statute (without unreasonable delay) |
| Affected users | direct comms | as soon as scope is determined and legal cleared |
| Public statement | comms lead | per legal direction |

## Forbidden

- discussing the incident in unrestricted channels
- speculating on cause in public statements
- modifying logs or evidence during the response window
- delaying regulator notification for PR reasons
