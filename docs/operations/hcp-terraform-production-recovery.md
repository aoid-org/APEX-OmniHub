# HCP Terraform Production Recovery

Status: active recovery runbook
Scope: `terraform/environments/production` and the HCP Terraform workspace `omnihub-production`

This package exists for one incident class:

- HCP Terraform workspace `omnihub-production` is stuck at **Waiting for configuration**.
- An old local or CI Terraform run fails with `lstat ../../modules: no such file or directory`.

Do not commit secrets, `.terraform/`, plans, state files, or `terraform.tfvars`.

## Current repo contract

Production Terraform is intentionally self-contained under:

```text
terraform/environments/production/
```

The production root must use:

```hcl
cloud {
  organization = "APEX-OmniHub"
  workspaces {
    name = "omnihub-production"
  }
}
```

Production module sources must stay inside the HCP upload root:

```hcl
module "cloudflare" {
  source = "./cloudflare"
}

module "redis" {
  source = "./upstash"
}
```

Do not change production back to `../../modules/*`. HCP remote execution does not receive files outside the configured working directory upload archive, so escaping the upload root reopens the old failure.

## Non-secret preflight

Run from the repo root:

```bash
npm run terraform:production:check
```

This verifies:

- production module copies exist under the production upload root
- production module sources do not escape to `../../modules`
- HCP organization/workspace names match the production contract
- `.github/workflows/release.yml` still runs Terraform from the production directory
- the release workflow still uses `TF_PROD_TOKEN` as the HCP Terraform credential

This check does not read or require real secrets.

## Recovery path A: workspace waiting for configuration

Use this when HCP shows **Waiting for configuration** and no plan has started.

1. Confirm the workspace is `APEX-OmniHub/omnihub-production`.
2. Confirm the workspace working directory is `terraform/environments/production` if it is VCS-driven.
3. If the workspace is meant to be CLI-driven by GitHub Actions, trigger the repo release path after the non-secret preflight passes. The CLI run uploads the configuration from `terraform/environments/production`.
4. Cancel stale queued runs that were created before the working directory or module-source fix.
5. Re-run plan only after the uploaded configuration includes the local `./cloudflare` and `./upstash` module folders.

Expected result: the workspace receives a configuration version and advances from **Waiting for configuration** to planning.

## Recovery path B: old CLI run fails on `../../modules`

Use this when logs include a missing shared module path such as:

```text
lstat ../../modules: no such file or directory
```

1. Run `npm run terraform:production:check`.
2. Confirm `terraform/environments/production/main.tf` uses `./cloudflare` and `./upstash`.
3. Confirm these directories exist:
   - `terraform/environments/production/cloudflare`
   - `terraform/environments/production/upstash`
4. Discard the stale plan/run that referenced `../../modules`.
5. Start a fresh plan from the current repo state.

The canonical shared module sources still live under `terraform/modules/` for staging and future local environments. Production carries local copies because HCP remote execution needs all production configuration under one upload root.

## Safe local validation commands

These commands are safe because they do not include secret values in the repo:

```bash
npm run terraform:production:check
cd terraform/environments/production
terraform fmt -check -recursive
```

Only run `terraform init`, `terraform validate`, `terraform plan`, or `terraform apply` in an operator shell or CI context that already has approved HCP credentials and workspace variables. Do not paste secrets into docs, tickets, PRs, or chat.

## Required secret locations

Values are intentionally omitted.

- GitHub repository secret: `TF_PROD_TOKEN`
- GitHub environment secret for `production-shadow`: `TF_PROD_TOKEN`
- HCP Terraform workspace variables required by `terraform/environments/production/variables.tf`
- Provider credentials for Cloudflare and Upstash as sensitive variables

If Terraform asks for unrelated historical variables that are declared but not used by current production resources, set placeholder non-secret values in the workspace only if Terraform requires them, then remove the declarations in a separate reviewed cleanup. Do not block recovery on application-code edits.

## Release safety rules

- Do not touch application code for this recovery.
- Do not change DNS records or rate-limit settings unless an approved plan explicitly shows that as the intended action.
- Treat repo checks as implementation evidence only. Live HCP recovery is proven by a new successful HCP run, not by the existence of this document.
- After a successful plan/apply, attach the HCP run URL and the non-secret command output to the incident record.
