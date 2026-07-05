output "nameservers" {
  description = "Cloudflare nameservers"
  value       = data.cloudflare_zone.main.name_servers
}

output "zone_id" {
  description = "Cloudflare Zone ID"
  value       = var.zone_id
}

# waf_ruleset_id output removed because cloudflare_ruleset.waf is intentionally
# omitted from Terraform management (see main.tf for details).

data "cloudflare_zone" "main" {
  zone_id = var.zone_id
}
