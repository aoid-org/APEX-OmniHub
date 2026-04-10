# VERCEL MODULE
# Frontend deployment and configuration

terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

resource "vercel_project" "main" {
  name      = var.project_name
  framework = "vite"

  # Provider expects git_repository as an object argument, not a nested block.
  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  # Build settings
  build_command    = "npm run build"
  output_directory = "dist"
  install_command  = "npm install"
}

# Environment variables (synced from Doppler)
resource "vercel_project_environment_variable" "env_vars" {
  # nonsensitive() is required because for_each keys cannot be marked sensitive.
  for_each = nonsensitive(var.env_vars)

  project_id = vercel_project.main.id
  key        = each.key
  value      = each.value
  target     = [var.environment]
}

# Custom domain
resource "vercel_project_domain" "main" {
  count = var.custom_domain != "" ? 1 : 0

  project_id = vercel_project.main.id
  domain     = var.custom_domain
}
