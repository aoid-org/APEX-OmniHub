---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Threat Model: <System / Feature Name>

Author: <Name>
Date: <YYYY-MM-DD>
Reviewers: <Security / Architecture>
Related RFC: <link>
Service Tier: T1 | T2 | T3 | T4

Required for: new T1/T2 features, any authentication/authorization change, any P0/P1 data introduction, any new AI agent with write authority, any new public-facing surface.

---

## 1. System Description

- what does this system do
- who uses it
- what data does it touch (link to classification per `DATA_CLASSIFICATION.md`)

## 2. Trust Boundaries

Diagram the system with explicit boundaries:
- internet ↔ edge
- edge ↔ application
- application ↔ data store
- application ↔ third-party (per vendor)
- AI agent ↔ business logic
- privileged operator ↔ admin surface

## 3. Data Flow

For each flow, note: classification (P0/P1/P2/P3/P4), protocol, authn, authz, encryption state.

## 4. STRIDE Analysis

| Threat | Category | Asset | Vector | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|---|---|---|
| Token replay | Spoofing | session token | reused after logout | M | H | rotate on logout + short TTL + replay cache | L |
| RLS bypass via service role | Tampering | tenant data | misuse of service_role key in client | L | C | service_role only on server, network-isolated | L |
| ... | ... | ... | ... | ... | ... | ... | ... |

Categories: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.

## 5. AI-Specific Threats (if applicable)

- prompt injection from user input
- prompt injection from third-party content the agent ingests
- tool/function misuse (agent invokes mutation it shouldn't)
- data exfiltration via crafted output
- model jailbreak leading to policy violation
- cost-based DoS via expensive prompts

For each: mitigation and detection.

## 6. Abuse Cases

Not just "what could break" — what could a determined adversary do on purpose?

## 7. Detection

How would we know we are under attack? Which signal, which dashboard, which alert?

## 8. Response

For the top 3 threats: incident runbook reference, blast-radius reduction commands, customer notification gate.

## 9. Open Questions

- <question>

## 10. Sign-Off

Security: <Name / Date>
Architecture: <Name / Date>
Domain Owner: <Name / Date>
