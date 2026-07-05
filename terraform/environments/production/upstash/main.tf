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

# NOTE: upstash_redis_database is intentionally omitted from Terraform management.
# The Upstash free plan allows only 1 database and one already exists in the account.
# To bring the existing database under Terraform management, run:
#
#   terraform import module.redis.upstash_redis_database.main <DATABASE_ID>
#
# where DATABASE_ID is the Upstash database ID from the Upstash console.
# Until then, the database is managed directly via the Upstash console.
#
# When creating a new database (e.g., after upgrading the Upstash plan), use:
#   region         = "global"
#   primary_region = "us-east-1"
#   tls            = true
#   eviction       = true   # bool, not string
