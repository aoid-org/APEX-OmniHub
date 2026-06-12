---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.4.x   | Yes                |
| 1.3.x   | Yes (security only)|
| < 1.3   | No                 |

## Reporting a Vulnerability

Please report security issues to **security@apexbusiness-systems.com**.

## Response Targets

| Milestone                        | Target    |
| -------------------------------- | --------- |
| Initial acknowledgment           | 72 hours  |
| Severity assessment              | 5 days    |
| Patch / mitigation               | 30 days   |
| Full resolution (critical/high)  | 90 days   |

## Scope

This policy covers production systems and services under:

- `apexbusiness-systems.com` and all subdomains
- The APEX OmniHub application (`github.com/apexbusiness-systems/APEX-OmniHub`)
- Associated Supabase edge functions and backend services
- Web3 / smart-contract integrations deployed by APEX

**Out of scope**: Third-party services integrated via API, social-engineering attacks, physical attacks, DoS/DDoS.

## Severity Classification

We follow the [CVSS v3.1](https://www.first.org/cvss/) scoring framework:

| Rating   | Score     |
| -------- | --------- |
| Critical | 9.0–10.0  |
| High     | 7.0–8.9   |
| Medium   | 4.0–6.9   |
| Low      | 0.1–3.9   |

## Coordinated Disclosure

We follow responsible disclosure principles:

- We will acknowledge your report within **72 hours**.
- We will keep you informed of remediation progress.
- We ask that you **do not publicly disclose** the vulnerability until we confirm full remediation or until 90 days have elapsed from the initial report, whichever comes first.
- Credit will be given to researchers who follow this policy, in our release notes or a dedicated security acknowledgements file, unless anonymity is requested.

## Security Hall of Fame

We maintain a security acknowledgements list for researchers who responsibly disclose valid vulnerabilities. Contact security@apexbusiness-systems.com to be added.
