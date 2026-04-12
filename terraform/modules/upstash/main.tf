# UPSTASH REDIS MODULE
# Serverless Redis for rate limiting and caching

terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.0"
    }
  }
}

resource "upstash_redis_database" "main" {
  database_name = var.database_name
  region        = var.region
  tls           = true
  eviction      = var.eviction_policy

  # Provider now enables multi-zone automatically for paid databases.
}
