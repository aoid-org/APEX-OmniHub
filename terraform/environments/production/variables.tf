# All sensitive values are provided via environment variables:
# TF_VAR_vercel_api_token, TF_VAR_cloudflare_api_token
# Non-sensitive defaults are set in terraform.tfvars (gitignored)

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (from vercel.com/teams)"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:Edit, DNS:Edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for apexomnihub.icu"
  type        = string
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "apexomnihub.icu"
}
