---
status: completed
completed_date: 2026-06-21
---

# Release Remediation Follow-up — Claim Hygiene, CI Integrity, Secret Scan

Date: 2026-06-16

Context: Post-review merge blockers identified that the prior remediation self-attested risky compliance/SLA claims, documented a release job as PR-required despite no `pull_request` trigger, left broad secret-scan blind zones, did not wire scanner fixture tests into CI, and allowed release evidence certification when Terraform apply result was manually set to pass without a success outcome.

Actions taken:

- Removed self-attested claim approvals from `docs/release/approved-claims.json`; evidence refs must now point to separate artifacts and valid anchors.
- Downgraded public compliance/certification/SLA copy to control-readiness, privacy-record workflow, human-oversight, or demo/sample wording unless external evidence exists.
- Documented `release.yml` as a protected post-merge/main release gate, not a PR-required branch-protection check.
- Hardened `verify-ci-integrity` so documented PR-required checks must be backed by workflows with `pull_request` triggers.
- Removed broad docs/tests/agent/skills secret-scan exclusions; only exact known synthetic fixture files are exempted.
- Wired `test:secret-scan` into `verify:security`.
- Required Terraform apply outcome `success` in addition to apply result `pass` before release evidence can be `CERTIFIED`.
- Added retry/backoff around mobile workflow `npm ci` installs to reduce transient registry `ECONNRESET` failures without masking build failures.

Remaining operator requirement: do not add externally certified/compliant claims back to public copy unless separate certification evidence artifacts are committed and referenced by the claim hygiene allowlist.

> **Resolved 2026-06-21.** Python 3.11 pinned in release.yml (RFC_2026_06_19). CI green as of PR #1445.
