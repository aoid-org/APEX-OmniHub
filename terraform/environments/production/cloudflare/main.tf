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

# DNS Records
# allow_overwrite = true because records already exist in zone
resource "cloudflare_record" "root" {
  zone_id         = var.zone_id
  name            = "@"
  content         = var.origin_cname
  type            = "CNAME"
  proxied         = true
  allow_overwrite = true
  comment         = "Root domain pointing to Cloudflare Pages origin"
}

resource "cloudflare_record" "www" {
  zone_id         = var.zone_id
  name            = "www"
  content         = var.origin_cname
  type            = "CNAME"
  proxied         = true
  allow_overwrite = true
  comment         = "WWW subdomain pointing to Cloudflare Pages origin"
}

# NOTE: cloudflare_ruleset.waf (http_request_firewall_custom phase) is intentionally
# omitted from Terraform management because a ruleset for this phase already exists
# in the zone and Cloudflare does not allow duplicate rulesets per phase.
# WAF custom rules are managed directly in the Cloudflare dashboard.

# Rate Limiting Rules (Cloudflare Ruleset Engine)
# Free plan: max 1 rule in http_ratelimit phase, period must be 10 seconds.
resource "cloudflare_ruleset" "rate_limits" {
  zone_id     = var.zone_id
  name        = "OmniHub Rate Limits"
  description = "Rate limiting for API and sensitive endpoints"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules {
    action      = "managed_challenge"
    expression  = "(http.host eq \"${var.domain}\" and (starts_with(http.request.uri.path, \"/api/\") or starts_with(http.request.uri.path, \"/functions/v1/\")))"
    description = "Rate limit API and sensitive Edge Function endpoints"
    enabled     = true
    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = var.rate_limit_threshold
      mitigation_timeout  = 3600
    }
  }
}

# Cache Rules (replaces deprecated Page Rules)
# Account-owned tokens are supported with cloudflare_ruleset.
resource "cloudflare_ruleset" "cache_rules" {
  zone_id     = var.zone_id
  name        = "OmniHub Cache Rules"
  description = "Cache rules for static assets - replaces deprecated Page Rules"
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules {
    action      = "set_cache_settings"
    expression  = "(http.host eq \"${var.domain}\" and starts_with(http.request.uri.path, \"/assets/\"))"
    description = "Cache static assets"
    enabled     = true
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 7200
      }
      browser_ttl {
        mode    = "override_origin"
        default = 14400
      }
    }
  }
}
