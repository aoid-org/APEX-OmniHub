output "cloudflare_nameservers" {
  description = "Cloudflare nameservers"
  value       = module.cloudflare.nameservers
}

output "staging_url" {
  description = "Staging environment URL"
  value       = "https://staging.omnihub.dev"
}

output "redis_database_id" {
  description = "Redis database ID"
  value       = module.redis.database_id
}
