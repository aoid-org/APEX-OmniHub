# Data Classification & Handling Policy

Version: 1.0.0
Owner: Security + Architecture
Applies To: every service, store, queue, log, AI agent, third-party integration

---

## Classification Tiers

| Tier | Examples | Storage | Transit | Logging | Retention |
|---|---|---|---|---|---|
| **P0 — Secret** | API keys, JWT signing keys, Stripe live keys, DB master creds, OAuth client secrets | KMS / Secret Manager only. Never in code, env files committed to repo, or product DB. | TLS 1.2+, mTLS where available | NEVER log raw value. Log hash prefix only. | Rotate ≤ 90 days. Revoke on suspected exposure ≤ 15 min. |
| **P1 — Restricted PII / Financial** | Government ID, SIN/SSN, full card number (PAN), full bank account, biometric, health data | Encrypted at rest (AES-256). Tokenize where possible. Access via row-level security + audit. | TLS 1.2+ only. | Hash or last-4 mask only. No raw in logs. | Per jurisdiction (PIPEDA / GDPR). Default 7 years for financial, deletion on user request unless legal hold. |
| **P2 — Confidential PII** | Email, full name, phone, address, DOB, photo, IP, device ID, payment card last-4 | Encrypted at rest. RLS enforced. | TLS 1.2+ only. | Mask in logs (e.g. `j***@apex.io`, `***-***-1234`). | Minimum required per business purpose. Default 3 years post-account-deletion (audit trail). |
| **P3 — Internal** | Product analytics, aggregated metrics, internal Slack content, internal Notion docs | Standard cloud storage with auth. | TLS recommended. | Free to log without masking. | Per retention policy (default 13 months for product analytics). |
| **P4 — Public** | Marketing copy, public docs, open-source code, public stats | Any. | Any. | Any. | Indefinite. |

---

## Handling Rules

1. **Default deny.** Treat unclassified data as **P2** until classified.
2. **Minimization.** Collect only what is required to deliver the workflow.
3. **Purpose binding.** Data collected for purpose X may not be re-used for purpose Y without RFC + re-consent.
4. **Tier escalation only with RFC.** Moving data into a higher tier (e.g. starting to collect biometrics) requires RFC + privacy review.
5. **No cross-tier mixing in the same column.** Do not put P1 data inside a P3 analytics table.
6. **Encryption in code is not enough.** P0 and P1 must be encrypted at the storage layer too.
7. **AI agents must declare class.** Any AI prompt or context window that ingests P1+ data must be logged with redaction policy applied.

## Required Per Table / Store

- declared classification tier
- declared owning domain
- declared retention period
- declared deletion procedure
- declared access path (who, via what API)
- declared audit event on read/write where required

## Subject Rights (PIPEDA / GDPR Aligned)

| Right | SLA | Owner |
|---|---|---|
| Access (export user data) | ≤ 30 days | Data Ops |
| Correction | ≤ 14 days | Domain owner |
| Deletion (where lawful) | ≤ 30 days | Domain owner + Data Ops |
| Restriction / objection | ≤ 14 days | Privacy reviewer |
| Portability | ≤ 30 days | Data Ops |

## Breach Notification

- Suspected breach of P0 or P1 data: page on-call within **15 minutes**.
- Confirmed breach: notify Office of the Privacy Commissioner of Canada (PIPEDA) within statutory window, affected users without undue delay.
- See `governance/security/INCIDENT_DISCLOSURE.md`.

## Forbidden

- screenshotting P1 / P2 data into Slack, Notion, Linear without redaction
- copying production P1 data into staging or dev databases
- letting AI agents read P0 secrets, ever
- exporting P1 data to CSV without expiring access link
