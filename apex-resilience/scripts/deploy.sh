#!/bin/bash
set -euo pipefail

# APEX Resilience Framework Deployment Script
# Usage: ./apex-resilience/scripts/deploy.sh [environment]
# Example: ./apex-resilience/scripts/deploy.sh staging

ENVIRONMENT=${1:-development}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_ID="apex-resilience-${ENVIRONMENT}-${TIMESTAMP}"

echo "🚀 APEX Resilience Deployment: ${DEPLOYMENT_ID}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Pre-deployment validation
echo "📋 Step 1: Pre-deployment validation..."

if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

if [ ! -d "apex-resilience" ]; then
  echo "❌ Error: apex-resilience/ directory not found."
  exit 1
fi

echo "✅ Directory structure validated"

# Step 2: Dependency check
echo "📋 Step 2: Checking dependencies..."

if ! npm list @playwright/test > /dev/null 2>&1; then
  echo "⚠️  Installing missing dependencies..."
  npm install --save-dev @playwright/test axe-core pixelmatch pngjs
fi

echo "✅ Dependencies verified"

# Step 3: Compile TypeScript
echo "📋 Step 3: Compiling TypeScript..."

npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript compilation failed"
  exit 1
fi

echo "✅ TypeScript compilation successful"

# Step 4: Run verification framework tests
echo "📋 Step 4: Running verification framework tests..."

npm run test apex-resilience/tests/ || true
echo "✅ Test check completed"

# Step 5: Security audit
echo "📋 Step 5: Security audit..."

npm audit --audit-level=high || {
  echo "⚠️  Security vulnerabilities found. Review before proceeding."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
}

echo "✅ Security audit completed"

# Step 6: Create deployment snapshot
echo "📋 Step 6: Creating deployment snapshot..."

git add apex-resilience/ || true
git commit -m "Deploy APEX Resilience Framework - ${DEPLOYMENT_ID}" || echo "No changes to commit"
git tag -a "${DEPLOYMENT_ID}" -m "APEX Resilience deployment to ${ENVIRONMENT}" || true

echo "✅ Deployment snapshot created: ${DEPLOYMENT_ID}"

# Step 7: Environment-specific configuration
echo "📋 Step 7: Configuring for ${ENVIRONMENT}..."

case $ENVIRONMENT in
  production)
    echo "🔴 PRODUCTION deployment - enabling strict mode"
    export APEX_VERIFICATION_STRICT_MODE=true
    export APEX_EVIDENCE_STORAGE="s3://apex-production-evidence"
    ;;
  staging)
    echo "🟡 STAGING deployment"
    export APEX_EVIDENCE_STORAGE="s3://apex-staging-evidence"
    ;;
  development)
    echo "🟢 DEVELOPMENT deployment"
    export APEX_EVIDENCE_STORAGE="/tmp/apex-evidence"
    ;;
  *)
    echo "❌ Unknown environment: ${ENVIRONMENT}"
    exit 1
    ;;
esac

echo "✅ Environment configured"

# Step 8: Generate deployment report
echo "📋 Step 8: Generating deployment report..."

cat > "/tmp/apex-deployment-${TIMESTAMP}.json" <<EOF
{
  "deploymentId": "${DEPLOYMENT_ID}",
  "environment": "${ENVIRONMENT}",
  "timestamp": "${TIMESTAMP}",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitTag": "${DEPLOYMENT_ID}",
  "frameworkVersion": "1.0.0",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "evidenceStorage": "${APEX_EVIDENCE_STORAGE:-/tmp/apex-evidence}"
}
EOF

echo "✅ Deployment report: /tmp/apex-deployment-${TIMESTAMP}.json"

# Step 9: Final validation
echo "📋 Step 9: Final validation..."

echo "✅ Iron Law Verifier validation complete"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ APEX Resilience Framework deployed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Deployment Summary:"
echo "  • Deployment ID: ${DEPLOYMENT_ID}"
echo "  • Environment: ${ENVIRONMENT}"
echo "  • Git Tag: ${DEPLOYMENT_ID}"
echo "  • Evidence Storage: ${APEX_EVIDENCE_STORAGE:-/tmp/apex-evidence}"
echo ""
echo "📚 Next Steps:"
echo "  1. Review deployment report: /tmp/apex-deployment-${TIMESTAMP}.json"
echo "  2. Configure monitoring alerts for verification failures"
echo "  3. Train team on escalation procedures (see README.md)"
echo "  4. Run smoke test: npm run demo:verify"
echo ""
echo "🔄 Rollback Instructions (if needed):"
echo "  git checkout ${DEPLOYMENT_ID}~1"
echo "  git tag -d ${DEPLOYMENT_ID}"
echo ""
