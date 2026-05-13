# Shadow Deployment Blockers — 2026-05-13

## Status: BLOCKED — Shadow slot not provisioned

A real shadow deployment to Cloudflare Pages cannot be executed from the release
workflow until the following items are resolved. The release workflow has been
hardened to skip shadow deployment when the required infrastructure and secrets
are absent, rather than running a fake background process.

---

## Required to Unblock Shadow Deployment

### 1. Cloudflare Pages Shadow Project

A dedicated Cloudflare Pages project must exist for shadow traffic. This is
separate from the production project.

**Action required:** Provision a Cloudflare Pages project named
`apex-omnihub-shadow` (or update `CLOUDFLARE_SHADOW_PROJECT_NAME` variable).

### 2. Required Repository Secrets / Variables

| Name | Type | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | CF API token with Pages:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare account ID |
| `CLOUDFLARE_SHADOW_PROJECT_NAME` | Variable | Pages project name for shadow slot |
| `ENABLE_SHADOW_DEPLOYMENT` | Variable | Must be set to `true` to enable the step |
| `SHADOW_HEALTH_URL` | Variable | Full URL of the shadow deployment health endpoint |

None of these are currently provisioned in the repository. Setting
`ENABLE_SHADOW_DEPLOYMENT=true` without the above will cause the workflow to fail.

### 3. Orchestrator Shadow Target

The previous workflow used `python -m uvicorn main:app` started as a background
process within the CI runner — this is not a real deployment. It has been removed.

A real orchestrator shadow target must be a deployed instance (e.g., Cloud Run,
Railway, Fly.io, or equivalent) with a stable URL. The health endpoint at
`${SHADOW_HEALTH_URL}/health` must return HTTP 200.

### 4. Terraform Environment Protection

The Terraform apply step requires a GitHub Environment named `production-shadow`
with required reviewers configured. This must be provisioned in the repository
settings before atomic routing flips can be enabled.

---

## Interim Behavior (post-hardening)

When `ENABLE_SHADOW_DEPLOYMENT` is not `true`, the workflow:
1. Runs the Changesets action to create/update the Release PR or publish.
2. Uploads a `release-evidence.json` artifact recording the commit SHA,
   workflow run URL, shadow URL (none), health result (skipped), validator
   result (skipped), Terraform result (skipped), and verdict `SHADOW_NOT_PROVISIONED`.
3. Prints a clear skip message with instructions to provision the shadow slot.

No fake services are started. No Terraform apply runs without plan + approval.

---

## Certification Impact

Deployment target absent → Certification verdict is `NOT_CERTIFIED_BLOCKED`
until shadow slot is provisioned and a successful release run with all gates
passing is recorded in `release-evidence.json`.
