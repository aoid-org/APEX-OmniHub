---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Supply Chain Security Policy

Version: 1.0.0
Owner: Security + DevOps
Applies To: every dependency, container image, build artifact, third-party integration

---

## Principle

Every artifact shipping to production must be **identifiable, verifiable, and revocable**.

## Required Controls

### Dependencies

- All package manifests use lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `bun.lockb`, `requirements.lock`, `Cargo.lock`, etc.).
- No floating versions (`*`, `latest`) in production manifests.
- Dependencies are vulnerability-scanned on every PR (`osv-scanner`).
- Critical CVE response SLA: patch or mitigate within **72 hours**.
- High CVE: **7 days**. Medium: **30 days**.
- Vendored or forked dependencies require an ADR.

### Container Images

- Base images come from a curated allowlist (distroless, official Alpine/Debian slim, Cloudflare-provided).
- Images are scanned with Trivy in CI; build fails on `HIGH` or `CRITICAL` unpatched CVE.
- Images are signed (cosign) and verified at deploy.
- No `:latest` tags in production manifests; digests pinned.

### SBOM

- Every release produces an SBOM (CycloneDX or SPDX) attached as a build artifact.
- SBOM is retained for the lifetime of the release + 1 year.

### GitHub Actions

- Third-party actions are pinned by SHA, not tag, in production-critical workflows.
- New action approvals require a one-time security review.
- Workflow `permissions:` block is mandatory and minimum-required.
- `secrets.GITHUB_TOKEN` is read-only by default; write requires justification in PR.

### Vendor / Third-Party Services

Before integrating any third-party SaaS or API:

- security questionnaire completed (SOC 2 / ISO 27001 status, data residency, breach history)
- data classification confirmed for any data sent
- vendor outage handling documented (degraded mode, fallback)
- contract reviewed for SLA, liability, data ownership, exit clause
- removal procedure documented

## Required CI Gates

- `osv-scanner` on dependencies
- `trivy` on container images (when images are built)
- `cosign verify` on deploy (when images are used)
- `gitleaks` on every PR
- SBOM generation on every release tag

## Hard Stops

- production deploy with unsigned image
- production deploy of image with HIGH/CRITICAL CVE older than SLA
- new vendor in production without completed security review
- GitHub action pinned by tag (not SHA) in T1 workflow
