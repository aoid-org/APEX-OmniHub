---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v9.0-ADVISORY-90-REMEDIATION | LAST_UPDATED=2026-05-20 -->

# Dependency Scanning

- **Document Version:** 2.0.0
- **Platform Version:** 1.6.0
- **Last Updated:** 2026-05-20
- **Status:** Active

---

## Pipeline

- `.github/workflows/security-scan.yml` is the expected dependency scanning workflow for this project. It runs `npm audit` and supporting software-composition-analysis checks in CI.
- Local evidence is generated with `npm run security:audit` at the repo root and workspace-specific `npm audit` commands where a Dependabot alert is scoped to a nested app.
- Results surface in GitHub Actions summaries and generated artifacts.

## What It Runs

- Node security advisories via `npm audit`.
- Lockfile validation for the affected package manager (`package-lock.json`, `bun.lock`, or both when both are committed).
- Documentation drift checks through `npm run docs:check` after remediation notes are updated.

## 2026-05-15 Advisory #90 Resolution

| Field | Verified value |
| --- | --- |
| Advisory | `serialize-javascript` CPU exhaustion DoS via crafted array-like objects |
| Affected range | `<7.0.5` |
| Fixed version | `7.0.5` |
| Affected workspace | `apps/omnihub-site` |
| Transitive path | `vite-plugin-pwa@1.3.0` → `workbox-build@7.4.1` → `@rollup/plugin-terser@1.0.0` → `serialize-javascript` |
| Remediation | `apps/omnihub-site` override and npm/Bun lockfiles now resolve `serialize-javascript@7.0.5` |
| Local audit result | `npm audit --package-lock-only --omit=dev` reports `found 0 vulnerabilities` |

## How to Review Results

1. Check the GitHub Actions run for `security-scan` JSON output and summary annotations.
2. For repo-root validation, run `npm run security:audit` to produce `security/npm-audit-latest.json`.
3. For nested workspace advisories, run the workspace-specific audit from that workspace directory.
4. For advisory process and current dispositions, see [Security Advisory Handling](SECURITY_ADVISORIES.md).

## Policy

- Production dependencies with a patched version must be remediated immediately through an upgrade or the narrowest viable override.
- Development-only dependencies may be risk-accepted only when exploitability is limited to trusted local tooling and the risk acceptance is documented.
- Lockfiles are release artifacts and must match manifest overrides before a vulnerability can be marked resolved.
