variable "zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain" {
  description = "Domain name (e.g., omnihub.dev)"
  type        = string
}

variable "origin_cname" {
  description = "Origin CNAME target for Cloudflare DNS records"
  type        = string
  default     = "omnihub.pages.dev"
}

variable "rate_limit_threshold" {
  description = "Rate limit threshold (requests per minute)"
  type        = number
  default     = 100
}

variable "security_level" {
  description = "Security level (off, essentially_off, low, medium, high, under_attack)"
  type        = string
  default     = "medium"
}
