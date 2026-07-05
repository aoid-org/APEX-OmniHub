# UPSTASH OUTPUTS
# NOTE: These outputs are commented out because upstash_redis_database.main is not
# currently managed by Terraform (free plan 1-DB limit, DB already exists).
# To restore these outputs, first import the existing database:
#   terraform import module.redis.upstash_redis_database.main <DATABASE_ID>
# Then uncomment the outputs below.

# output "redis_url" {
#   description = "Redis connection URL"
#   value       = upstash_redis_database.main.endpoint
#   sensitive   = true
# }

# output "redis_token" {
#   description = "Redis authentication token"
#   value       = upstash_redis_database.main.rest_token
#   sensitive   = true
# }

# output "database_id" {
#   description = "Database ID"
#   value       = upstash_redis_database.main.database_id
# }
