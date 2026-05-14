# Shadow Deployment Certification Blockers — 2026-05-14

## Status: BLOCKED — external shadow infrastructure not yet verified

A release cannot be marked `CERTIFIED` until a real Cloudflare Pages shadow deployment is provisioned, validated, and promoted through the protected Terraform approval path. The repository now has fail-closed preflight and evidence generation so CI cannot silently skip these blockers or emit a misleading certification verdict.

---

## Active Blockers

| ID | Blocker | Severity | Automated control |
|---|---|---:|---|
| B-1 | Cloudflare Pages shadow slot is not verified as provisioned, or required Cloudflare secrets/vars are absent. | P0 | `scripts/ci/shadow-certification-preflight.mjs` checks `ENABLE_SHADOW_DEPLOYMENT`, Cloudflare credentials, project name, and health URL before deploy. |
| B-2 | `release-evidence.json` with `CERTIFIED` or `CERTIFICATION_PENDING_FINAL_MAIN_CI` has not yet been produced by a real release run. | P0 | `.github/workflows/release.yml` always uploads `release-evidence.json`; `scripts/ci/write-release-evidence.mjs` computes the verdict from actual preflight/deploy/health/validator/Terraform outputs. |
| B-3 | GitHub Environment `production-shadow` with required reviewer protection is not verified for Terraform apply approval. | P1 | `scripts/ci/shadow-certification-preflight.mjs` queries the GitHub Environments API and blocks certification when required reviewers are absent or unverifiable. |

These blockers require external GitHub/Cloudflare configuration. Do **not** update this document to `CERTIFIED` until the release artifact from a real `main` workflow run proves the final verdict.

---

## Required Repository Configuration

### Cloudflare Pages shadow project

Provision a dedicated Cloudflare Pages project for shadow traffic. The default expected name is:

```text
apex-omnihub-shadow
```

If a different project is used, set the repository variable below to the exact project name.

### Required repository secrets

| Name | Required value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with permission to deploy Cloudflare Pages projects. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID that owns the shadow Pages project. |
| `TF_TOKEN` | Terraform token used by the production environment apply path, if atomic routing flip is enabled. |

### Required repository variables

| Name | Required value |
|---|---|
| `ENABLE_SHADOW_DEPLOYMENT` | `true` after the Cloudflare Pages shadow project and secrets are ready. |
| `CLOUDFLARE_SHADOW_PROJECT_NAME` | Shadow Pages project name, for example `apex-omnihub-shadow`. |
| `SHADOW_HEALTH_URL` | Full base URL for the shadow deployment health target. |
| `ENABLE_ATOMIC_ROUTING_FLIP` | `true` only after `production-shadow` reviewers are configured. |

### Required GitHub Environment

Create a GitHub Environment named:

```text
production-shadow
```

Configure required reviewers for Terraform apply approval. The release preflight treats the environment as blocked if the GitHub API cannot verify a `required_reviewers` protection rule.

---

## Automated Release Controls

The release workflow now enforces the following sequence:

1. Run Changesets release/publish logic.
2. Run `node scripts/ci/shadow-certification-preflight.mjs`.
3. Deploy to Cloudflare Pages shadow slot only when preflight status is `pass`.
4. Run shadow `/health` polling against the real deployment URL.
5. Run deterministic validator against the real shadow URL.
6. Run Terraform plan/apply only after shadow validation and the protected `production-shadow` environment approval path.
7. Always upload `release-evidence.json` and `shadow-preflight.json` artifacts.
8. Fail enabled shadow releases when preflight is blocked instead of silently skipping deployment.

Interim, non-certified releases keep a machine-readable blocker list in `release-evidence.json` with verdict `NOT_CERTIFIED_BLOCKED` or `NOT_CERTIFIED_NO_RELEASE_PUBLISHED`.

---

## Local Preflight Commands

Run these from the repository root:

```bash
npm run release:shadow-preflight
npm run release:evidence
```

For strict local/CI gating, run:

```bash
node scripts/ci/shadow-certification-preflight.mjs --strict
```

The strict command exits non-zero until B-1 and B-3 are resolved.

---

## Path to `CERTIFIED`

1. Provision the Cloudflare Pages shadow project.
2. Set repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `TF_TOKEN` when atomic routing flip is enabled.
3. Set repository variables:
   - `CLOUDFLARE_SHADOW_PROJECT_NAME`
   - `SHADOW_HEALTH_URL`
   - `ENABLE_SHADOW_DEPLOYMENT=true`
   - `ENABLE_ATOMIC_ROUTING_FLIP=true` after Terraform approval protection is configured.
4. Configure GitHub Environment `production-shadow` with required reviewers.
5. Merge to `main` and confirm all required CI gates pass.
6. Confirm the release workflow artifact `release-evidence.json` reports either:
   - `CERTIFICATION_PENDING_FINAL_MAIN_CI` when shadow validation passed and final protected apply is still pending, or
   - `CERTIFIED` when shadow validation and Terraform promotion passed.
7. Update this document from `BLOCKED` to `CERTIFIED` with the release evidence artifact link.

---

## Certification Rule

The only acceptable source of truth for certification is a `release-evidence.json` artifact produced by a real release workflow run on `main`. Manual claims, local mock evidence, skipped shadow deployments, or unverified environment settings do not certify the release.
