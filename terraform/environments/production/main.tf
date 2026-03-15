# APEX OmniHub — Production Infrastructure
# Managed by Terraform — do not edit via dashboards after this is applied.
# Apply: cd terraform/environments/production && terraform init && terraform apply

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "remote" {
    organization = "apex-business-systems"
    workspaces {
      name = "apex-omnihub-production"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ── Vercel Project ────────────────────────────────────────────────────────────
resource "vercel_project" "omnihub" {
  name      = "apex-omnihub"
  framework = "vite"

  git_repository = {
    type = "github"
    repo = "apexbusiness-systems/APEX-OmniHub"
  }

  build_command    = "npm run build"
  output_directory = "dist"
  install_command  = "npm install"
}

# ── Cloudflare DNS ────────────────────────────────────────────────────────────
resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"
  value   = "cname.vercel-dns.com"
  proxied = true
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  value   = "cname.vercel-dns.com"
  proxied = true
}

resource "cloudflare_record" "status" {
  zone_id = var.cloudflare_zone_id
  name    = "status"
  type    = "CNAME"
  value   = "betteruptime.com"
  proxied = false
}

# ── Cloudflare WAF — Block known bad actor IPs and common attack patterns ─────
resource "cloudflare_ruleset" "waf_managed" {
  zone_id     = var.cloudflare_zone_id
  name        = "APEX WAF Managed Rules"
  description = "Enable Cloudflare managed WAF rules for APEX OmniHub"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules {
    action = "execute"
    action_parameters {
      id = "efb7b8c949ac4650a09736fc376e9aee" # Cloudflare Managed Ruleset
    }
    expression  = "true"
    description = "Execute Cloudflare managed ruleset"
    enabled     = true
  }
}
