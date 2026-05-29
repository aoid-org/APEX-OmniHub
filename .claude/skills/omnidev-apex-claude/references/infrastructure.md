# INFRASTRUCTURE SOVEREIGN — OMNIDEV-APEX Reference

## Activation
Triggered by: deploy, infra, Docker, Kubernetes, Terraform, serverless, cloud, AWS, GCP, Azure, Cloudflare, FinOps, CI/CD

## Deploy Protocol (zero-downtime, always)
```
PRE-DEPLOY:
  □ All tests green (exit 0)
  □ Lint clean (zero warnings)
  □ Production build succeeds
  □ Rollback script written and tested
  □ FinOps cost delta estimated
  □ Feature flag configured (risk > low)

STAGING DEPLOY:
  □ Deploy to staging
  □ Smoke tests pass
  □ OTel traces flowing (verify in Jaeger/Grafana)
  □ No error rate spike in first 5 minutes

PRODUCTION DEPLOY:
  □ Feature flag: 1% → validate → 10% → validate → 100%
  □ Monitor: error rate | p99 latency | saturation | traffic (RED)

POST-DEPLOY:
  □ Health endpoints: all green
  □ OTel dashboards: within normal bands
  □ Cost: within 110% of pre-deploy estimate
  □ Alert channels: quiet (no triggered alerts)
```

## FinOps Gate (mandatory on every infra change)
```
BEFORE:  Estimate cost delta (new resources - removed resources)
ALERT:   Set billing alert at current_spend * 1.10
TAG:     project=X env=Y owner=Z cost-center=W (every resource)
REVIEW:  Include cost in every post-deploy verification
REPORT:  Monthly: cost per service, per environment, per feature
```

## Kubernetes — Production Invariants
```yaml
# Every container MUST have:
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"      # never unlimited
    memory: "512Mi"  # never unlimited

# Every deployment MUST have:
livenessProbe:
  httpGet: { path: /health/live, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health/ready, port: 8080 }
  initialDelaySeconds: 5
  periodSeconds: 5

# Every pod MUST have:
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: [ALL] }
```

## Terraform — Production Invariants
```hcl
# NEVER auto-approve on prod
# terraform plan → review → terraform apply

# State: always remote, always locked
terraform {
  backend "s3" {
    bucket         = "apex-tfstate"
    key            = "env/prod/service.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "apex-tfstate-lock"
  }
}

# Every resource: tagged
locals {
  common_tags = {
    Project    = var.project
    Env        = var.environment
    Owner      = var.owner
    CostCenter = var.cost_center
    ManagedBy  = "terraform"
  }
}
```

## CI/CD Pipeline Gates (all must pass — in order)
```yaml
jobs:
  quality-gate:
    steps:
      - lint          # zero warnings
      - typecheck     # zero errors
      - test          # 100% new coverage, exit 0
      - security-scan # zero high/crit (npm audit + semgrep)
      - build         # production build succeeds

  deploy-staging:
    needs: quality-gate
    steps:
      - deploy-to-staging
      - smoke-test
      - verify-otel-traces

  deploy-prod:
    needs: deploy-staging
    environment: production  # requires manual approval
    steps:
      - deploy-canary-1pct
      - validate-1pct
      - deploy-canary-10pct
      - validate-10pct
      - deploy-full
      - post-deploy-verify
```

## Docker — Production Invariants
```dockerfile
# Use distroless or minimal base
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
# Never: FROM node:latest

# Never run as root
USER nonroot:nonroot

# No secrets in image
# Use external secrets at runtime

# Multi-stage: build → runtime (never ship build tools to prod)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12
COPY --from=builder /app/dist /app
COPY --from=builder /app/node_modules /app/node_modules
CMD ["/app/server.js"]
```
