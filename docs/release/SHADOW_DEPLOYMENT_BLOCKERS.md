# Shadow Deployment Certification Blockers — 2026-05-14

## Resolution Status Summary

| ID | Severity | Status | Resolution Date | Next Action |
|---|---|---|---|---|
| B-1 | P0 | **RESOLVED** | 2026-05-20 | No action required. apex-omnihub-shadow project created via Cloudflare API; all 6 required secrets/variables set in GitHub repository. |
| B-2 | P0 | **`chore: version packages` MERGED 2026-06-05** (`959a8fd6`) | `release_signal` step in `release.yml` detects `chore: version packages` via `git log`. Release workflow must be triggered (push or manual dispatch) to produce `release-evidence.json`. |
| B-3 | P1 | **RESOLVED** | 2026-05-20 | No action required. production-shadow GitHub Environment created with required-reviewer protection rule. |

---

## Status: PENDING CI EXECUTION (B-1/B-3 resolved, B-2 version commit merged) — trigger `release.yml` on main to produce `release-evidence.json`

A release cannot be marked `CERTIFIED` until a real Cloudflare Pages shadow deployment is provisioned, validated, and promoted through the protected Terraform approval path. The repository now has fail-closed preflight and evidence generation so CI cannot silently skip these blockers or emit a misleading certification verdict.

B-1 and B-3 were resolved 2026-05-20. B-2 structural root cause resolved 2026-05-20 via PR #1185: the release workflow now detects private-package releases via `git log` commit subject (not npm publish). Evidence production pending the changesets version PR (`chore: version packages`) merge to main.

---

## Active Blockers

| ID | Blocker | Severity | Status | Automated control |
|---|---|---:|---|---|
| B-1 | Cloudflare Pages shadow slot is not verified as provisioned, or required Cloudflare secrets/vars are absent. | P0 | **RESOLVED 2026-05-20** — apex-omnihub-shadow project created via Cloudflare API; all 6 required secrets/variables set in GitHub repository. | `scripts/ci/shadow-certification-preflight.mjs` checks `ENABLE_SHADOW_DEPLOYMENT`, Cloudflare credentials, project name, and health URL before deploy. |
| B-2 | `release-evidence.json` with `CERTIFIED` verdict has not yet been produced by a real release workflow run with CI secrets. | P0 | **`chore: version packages` MERGED 2026-06-05** (`959a8fd6`) — `release_signal` step reads commit subject via `git log`; release workflow must be triggered in CI to complete shadow deploy + health check + evidence write. | `.github/workflows/release.yml` always uploads `release-evidence.json`; `scripts/ci/write-release-evidence.mjs` computes the verdict from actual preflight/deploy/health/validator/Terraform outputs. |
| B-3 | GitHub Environment `production-shadow` with required reviewer protection is not verified for Terraform apply approval. | P1 | **RESOLVED 2026-05-20** — production-shadow GitHub Environment created with required-reviewer protection rule. | `scripts/ci/shadow-certification-preflight.mjs` queries the GitHub Environments API and blocks certification when required reviewers are absent or unverifiable. |

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

### Where to get each required value

Use GitHub repository **secrets** for credentials/tokens and GitHub repository **variables** for non-secret release switches and names. In GitHub, set them under **Settings → Secrets and variables → Actions**; use the **Secrets** tab for secret values and the **Variables** tab for boolean/name/URL values.

| Name | GitHub storage | Where it comes from | Operator rule |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Create it in the Cloudflare dashboard under **Account API Tokens**. Use a Pages-capable token that can deploy the shadow Pages project. | Never paste this token into logs, docs, local env dumps, or PR comments. Rotate it if exposed. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Copy it from the Cloudflare dashboard for the account that owns the shadow Pages project. | Treat as sensitive deployment metadata in this repo even though Cloudflare account IDs are less sensitive than API tokens. |
| `TF_TOKEN` | Secret | Create an HCP Terraform/Terraform Cloud API token for the `omnihub` organization/workspace access path. Prefer a team/service-account token scoped to the `omnihub-production` workspace over a personal user token. | Required only when `ENABLE_ATOMIC_ROUTING_FLIP=true`; the workflow exposes it to Terraform CLI as `TF_TOKEN_app_terraform_io`. |
| `ENABLE_SHADOW_DEPLOYMENT` | Variable | This is an operator-controlled GitHub Actions variable, not a vendor-generated value. | Set to `true` only after the Cloudflare Pages project, Cloudflare token, account ID, and shadow project name are configured. Otherwise keep it unset or `false`. |
| `CLOUDFLARE_SHADOW_PROJECT_NAME` | Variable | Copy the exact Pages project name from Cloudflare **Workers & Pages**. The default planned value is `apex-omnihub-shadow`. | Must exactly match the project passed to `wrangler pages deploy --project-name`. |
| `SHADOW_HEALTH_URL` | Variable | Use the stable shadow deployment base URL after the Pages project exists, usually `https://<cloudflare-shadow-project-name>.pages.dev` or a configured shadow custom domain. | The app must respond with HTTP 200 at `${SHADOW_HEALTH_URL}/health`; do not include trailing `/health` in the variable. |
| `ENABLE_ATOMIC_ROUTING_FLIP` | Variable | This is an operator-controlled GitHub Actions variable, not a vendor-generated value. | Set to `true` only after `production-shadow` has required reviewers and `TF_TOKEN` is configured. Keep `false` if the release should validate shadow deploys without promoting routing. |

Official setup references:

- GitHub Actions secrets/variables: <https://docs.github.com/actions/learn-github-actions/variables>
- GitHub deployment environments and required reviewers: <https://docs.github.com/actions/reference/workflows-and-actions/deployments-and-environments>
- Cloudflare Pages API tokens and Pages project API: <https://developers.cloudflare.com/pages/configuration/api/>
- HCP Terraform/Terraform Cloud API tokens: <https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens>

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
