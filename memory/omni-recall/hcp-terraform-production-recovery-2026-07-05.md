# HCP Terraform production recovery guardrail — 2026-07-05

## Context

Production HCP Terraform workspace `APEX-OmniHub/omnihub-production` can become stuck at **Waiting for configuration** when no configuration version is uploaded, and stale local/CI runs can fail with `lstat ../../modules: no such file or directory` if production module sources escape the HCP upload root.

## Current contract

- Production Terraform root: `terraform/environments/production/`.
- Production HCP workspace: `APEX-OmniHub/omnihub-production`.
- Production module sources must remain `./cloudflare` and `./upstash` so HCP remote execution receives all required files in the upload archive.
- Shared modules remain under `terraform/modules/` for staging and future local environments; do not repoint production to `../../modules/*`.
- Non-secret guard command: `npm run terraform:production:check`.
- Operator runbook: `docs/operations/hcp-terraform-production-recovery.md`.

## Validation note

Repo-local checks are implementation evidence only. Live recovery is proven by a new successful HCP run URL attached to the incident record by an operator.
