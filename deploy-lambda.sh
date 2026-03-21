#!/bin/bash
# APEX-OmniHub: AWS Lambda Deployment Script
# Purpose: Deploys the OmniHubWorkerLambda to AWS via CDK.
#
# Prerequisites:
#   - Valid AWS credentials configured (aws configure / env vars / SSO)
#   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in environment or .env
#
# OWNED BY: APEX Business Systems Ltd.
set -euo pipefail

echo "[APEX] Initializing Cloud Deployment..."

# ── Load .env if present ──────────────────────────────────────────────
if [[ -f "$(dirname "$0")/.env" ]]; then
  echo "[APEX] Loading environment from .env..."
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/.env"
  set +a
fi

# ── Validate required environment variables ───────────────────────────
if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
  echo "[APEX] ERROR: VITE_SUPABASE_URL is not set." >&2
  exit 1
fi
if [[ -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  echo "[APEX] ERROR: VITE_SUPABASE_ANON_KEY is not set." >&2
  exit 1
fi

# ── Map VITE_ vars to the names the CDK stack expects ─────────────────
export SUPABASE_URL="$VITE_SUPABASE_URL"
export SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"

# ── Navigate to infrastructure package ────────────────────────────────
cd "$(dirname "$0")/packages/infrastructure"

# ── Install dependencies ─────────────────────────────────────────────
echo "[APEX] Installing infrastructure dependencies..."
bun install

# ── Bootstrap AWS environment (required for first-time accounts) ──────
echo "[APEX] Bootstrapping AWS environment..."
bun x cdk bootstrap

# ── Deploy the stack ──────────────────────────────────────────────────
echo "[APEX] Deploying OmniHubWorkerStack..."
bun x cdk deploy --require-approval never --outputs-file cdk-outputs.json

# ── Extract outputs ───────────────────────────────────────────────────
if [[ -f cdk-outputs.json ]]; then
  LAMBDA_ARN=$(python3 -c "
import json, sys
with open('cdk-outputs.json') as f:
    data = json.load(f)
for stack in data.values():
    for key, val in stack.items():
        if 'LambdaArn' in key:
            print(val)
            sys.exit(0)
print('')
" 2>/dev/null || echo "")

  if [[ -n "$LAMBDA_ARN" ]]; then
    echo "[APEX] Lambda ARN: $LAMBDA_ARN"
    echo "[APEX] Function Name: OmniHubWorkerLambda"

    # Update .env with the function name
    ENV_FILE="$(dirname "$0")/../../.env"
    if [[ -f "$ENV_FILE" ]]; then
      if grep -q "^AWS_LAMBDA_FUNCTION_NAME=" "$ENV_FILE"; then
        sed -i "s|^AWS_LAMBDA_FUNCTION_NAME=.*|AWS_LAMBDA_FUNCTION_NAME=OmniHubWorkerLambda|" "$ENV_FILE"
      else
        echo "" >> "$ENV_FILE"
        echo "# AWS Lambda (deployed via CDK)" >> "$ENV_FILE"
        echo "AWS_LAMBDA_FUNCTION_NAME=OmniHubWorkerLambda" >> "$ENV_FILE"
      fi
      echo "[APEX] Updated .env with AWS_LAMBDA_FUNCTION_NAME=OmniHubWorkerLambda"
    fi
  fi
  rm -f cdk-outputs.json
fi

echo "[APEX] Deployment Complete. Lambda is Live."
