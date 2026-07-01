# CLOUDFLARE MODULE
# Manages DNS, WAF, and DDoS protection for OmniHub

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Zone-level settings
#
# rocket_loader = "off": Rocket Loader rewrites every <script> tag on the
# page (including ones with a `src`) and injects its own inline bootstrap
# script to defer/reorder loading. That inline script has no nonce/hash
# matching this zone's CSP (`script-src 'self' https://static.cloudflareinsights.com
# https://cdnjs.cloudflare.com`, no 'unsafe-inline'), so the browser blocks
# it — this is a known, documented Cloudflare/CSP incompatibility, not an
# app bug (see docs/audits/omnidash-systemic-error-catalog-2026-06-28.md
# UI-019/E16, and the earlier "banner not shown" beforeinstallprompt failure
# it causes as a side effect). Only Rocket Loader is touched here — every
# other zone setting stays whatever it already is; Terraform only manages
# settings explicitly listed in this block.
resource "cloudflare_zone_settings_override" "omnihub" {
  zone_id = var.zone_id

  settings {
    rocket_loader = "off"
  }
}

# DNS Records
resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "@"
  value   = var.origin_cname
  type    = "CNAME"
  proxied = true
  comment = "Root domain pointing to Cloudflare Pages origin"
}

resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  value   = var.origin_cname
  type    = "CNAME"
  proxied = true
  comment = "WWW subdomain pointing to Cloudflare Pages origin"
}

# WAF Rules (OWASP Top 10 Protection)
resource "cloudflare_ruleset" "waf" {
  zone_id     = var.zone_id
  name        = "OmniHub WAF Rules"
  description = "Web Application Firewall rules for OmniHub"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules {
    action      = "block"
    expression  = "(cf.threat_score > 14)"
    description = "Block high threat score"
  }

  rules {
    action      = "challenge"
    expression  = "(cf.threat_score > 5)"
    description = "Challenge medium threat score"
  }
}

# Rate Limiting Rules (Cloudflare Ruleset Engine)
locals {
  # Keep endpoint list centralized so per-path rules are generated deterministically.
  sensitive_function_paths = toset([
    "/functions/v1/web3-verify",
    "/functions/v1/web3-nonce",
    "/functions/v1/apex-voice",
  ])
}

resource "cloudflare_ruleset" "rate_limits" {
  zone_id     = var.zone_id
  name        = "OmniHub Rate Limits"
  description = "Rate limiting rules for API and sensitive Edge Function endpoints"
  kind        = "zone"
  phase       = "http_ratelimit"

  # General API rate limit.
  rules {
    action      = "managed_challenge"
    # Contract: only match same-host API prefix traffic.
    expression  = "(http.host eq \"${var.domain}\" and starts_with(http.request.uri.path, \"/api/\"))"
    description = "Challenge high-rate API traffic"
    enabled     = true

    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 60
      requests_per_period = var.rate_limit_threshold
      mitigation_timeout  = 86400
    }
  }

  # Sensitive endpoint limits are stricter and generated per endpoint path.
  dynamic "rules" {
    for_each = local.sensitive_function_paths
    content {
      action      = "block"
      # Contract: only match exact sensitive path on configured host (no wildcard drift).
      expression  = "(http.host eq \"${var.domain}\" and http.request.uri.path eq \"${rules.value}\")"
      description = "Block burst traffic on sensitive endpoint: ${rules.value}"
      enabled     = true

      ratelimit {
        characteristics     = ["cf.colo.id", "ip.src"]
        period              = 60
        requests_per_period = 50
        mitigation_timeout  = 60
      }
    }
  }

}

# Page Rules
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = var.zone_id
  target   = "${var.domain}/assets/*"
  priority = 1

  actions {
    cache_level       = "cache_everything"
    edge_cache_ttl    = 7200
    browser_cache_ttl = 14400
  }
}

resource "cloudflare_page_rule" "security_headers" {
  zone_id  = var.zone_id
  target   = "${var.domain}/*"
  priority = 2

  actions {
    security_level = var.security_level
  }
}
