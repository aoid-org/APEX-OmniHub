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
  # Upstash deprecated regional database creation (HTTP 400: "regional db creation is deprecated").
  # All new databases must use region = "global". The primary_region field pins the
  # nearest write region for global databases.
  region         = "global"
  primary_region = "us-east-1"
  tls            = true
  # eviction is a bool (true = enable LRU eviction). The eviction policy is
  # managed at the Upstash console level, not via Terraform.
  eviction       = true

  # Provider >= 1.x enables multi-zone automatically for paid databases.
}
