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

# WAF Custom Rules
# Uses http_request_firewall_custom phase (not managed) for custom block/challenge expressions.
# Account-owned API tokens are supported here.
resource "cloudflare_ruleset" "waf" {
  zone_id     = var.zone_id
  name        = "OmniHub WAF Rules"
  description = "Web Application Firewall custom rules for OmniHub"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(cf.threat_score gt 14)"
    description = "Block high threat score"
    enabled     = true
  }

  rules {
    action      = "managed_challenge"
    expression  = "(cf.threat_score gt 5 and cf.threat_score le 14)"
    description = "Challenge medium threat score"
    enabled     = true
  }
}

# Rate Limiting Rules (Cloudflare Ruleset Engine)
# Free plan allows max 1 rule in http_ratelimit phase.
# Consolidating API + sensitive endpoint protection into a single rule.
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
      period              = 60
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
