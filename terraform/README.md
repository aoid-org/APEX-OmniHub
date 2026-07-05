# TERRAFORM INFRASTRUCTURE AS CODE
**Phase 3 - Week 5-6**

This directory contains Terraform infrastructure as code for OmniHub.

## Structure

```
terraform/
├── modules/              # Reusable Terraform modules
│   ├── cloudflare/      # DNS, WAF, DDoS protection
│   ├── upstash/         # Redis cache
│   └── vercel/          # Frontend deployment
├── environments/         # Environment configs
│   ├── staging/
│   └── production/
└── README.md
```

## Quick Start

```bash
cd terraform/environments/staging
terraform init
terraform plan
terraform apply
```

## Production HCP recovery

Production uses HCP Terraform workspace `APEX-OmniHub/omnihub-production`.
Before touching that workspace, run the non-secret repo preflight:

```bash
npm run terraform:production:check
```

If the workspace is stuck at **Waiting for configuration** or a stale run fails
on `../../modules`, use `docs/operations/hcp-terraform-production-recovery.md`.

See full documentation in docs/infrastructure/TERRAFORM_SETUP_GUIDE.md
