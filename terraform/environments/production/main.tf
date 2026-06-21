# PRODUCTION ENVIRONMENT
# Production-parity environment for testing
#
# SECURITY NOTE: State file contains secrets. This configuration uses
# Terraform Cloud for encrypted state storage with access controls.
#
# Backend options (in order of preference):
# 1. Terraform Cloud (current) - encrypted at rest, access controls, audit logs
# 2. S3 with KMS encryption + DynamoDB locking
# 3. Azure Blob Storage with encryption
#
# NEVER use local backend in production or staging environments.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.0"
    }
  }

  # PRODUCTION/STAGING: Use Terraform Cloud for encrypted state storage
  # Prerequisites:
  # 1. Organization "APEX-OmniHub" in HCP Terraform (already exists)
  # 2. Workspace "omnihub-production" (auto-created by the cloud{} block on init)
  # 3. Provide an org-scoped token via the TF_PROD_TOKEN secret
  #    (CI exposes it to Terraform CLI as TF_TOKEN_app_terraform_io)
  cloud {
    organization = "APEX-OmniHub"
    workspaces {
      name = "omnihub-production"
    }
  }

  # ALTERNATIVE: S3 backend with encryption
  # Uncomment below if using AWS instead of Terraform Cloud
  #
  # backend "s3" {
  #   bucket         = "omnihub-terraform-state"
  #   key            = "staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   kms_key_id     = "alias/terraform-state-key"
  #   dynamodb_table = "terraform-state-lock"
  # }
}

# Providers

# Environment target slot (active or production-shadow)
variable "target_slot" {
  description = "The deployment slot to route traffic to (active or production-shadow)"
  type        = string
  default     = "active"
}

locals {
  origin_cname = var.target_slot == "production-shadow" ? "shadow.omnihub.pages.dev" : "active.omnihub.pages.dev"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}


# Cloudflare DNS + WAF
# Module source is self-relative (./cloudflare) so HCP Terraform's remote plan
# executor receives it within the uploaded configuration archive.
# The canonical shared source lives at ../../modules/cloudflare; the copy here
# is intentional for remote-plan compatibility.
module "cloudflare" {
  source = "./cloudflare"
  origin_cname = local.origin_cname

  zone_id              = var.cloudflare_zone_id
  domain               = "apexomnihub.icu"
  rate_limit_threshold = 200   # Higher limit for staging
  security_level       = "low" # Less strict for testing
}

# Upstash Redis
module "redis" {
  source = "./upstash"

  database_name   = "omnihub-production"
  region          = "us-east-1"
  eviction_policy = "allkeys-lru"
  multi_zone      = false # Single zone for staging
}

# Cloudflare Pages is the active provider for staging; Vercel module intentionally removed.
