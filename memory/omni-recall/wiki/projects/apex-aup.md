---
name: apex-aup
description: APEX Automated Update Pipeline — Node.js/TypeScript microservice for iOS/Android CI/CD
type: project
verified: true
last-verified: 2026-05-23
---

# APEX-AUP

## One-Line Definition

Node.js/TypeScript microservice that automates iOS (CodeMagic) and Android (Google Play) app deployments, deployed on Google Cloud Run.

## Why

Zero-cost CI/CD orchestration for APEX Business Systems mobile app releases. Cloud Run free tier covers ~100 deploys/day with no artificial throttling.

## Architecture

- Express.js HTTP server (port 3001)
- `POST /api/aup/deploy` → AppleConduit (CodeMagic) or GoogleConduit (Google Play edit API)
- `GET /api/aup/deploy/:id` → poll deployment status
- `POST /webhooks/codemagic` → HMAC-verified build result callbacks
- `GET /health` → uptime probe
- Supabase Postgres for deployment state persistence
- PipelineOrchestrator: coordinates post-build metadata track (METADATA_FILLING → AWAITING_APPROVAL)
- ScreenshotAgent: uses `claude-sonnet-4-6` for AI screenshot pack auditing

## Stack

Node 20, TypeScript 5, Express 4, @supabase/supabase-js, googleapis, @anthropic-ai/sdk

## Deployment

Google Cloud Run via `.github/workflows/deploy.yml`. Secrets in Google Secret Manager, referenced in `cloud-run-service.yaml`.

## Migrations

- `migrations/001` — base schema
- `migrations/002` — full pipeline states + aup_metadata table

## Last Known State (2026-05-14)

- TypeScript: clean (0 errors)
- Tests: 9/9 green
- npm build: passing
- CI/CD pipeline: complete

## Required Secrets

GitHub Secrets: `GCP_PROJECT_ID`, `GCP_SA_KEY`, `CODEMAGIC_*`, `SUPABASE_*`, `INTERNAL_API_KEY`, `ANDROID_PACKAGE_NAME`
Google Secret Manager: matching secrets for runtime access

## Backfill Source

Promoted from session memory (session 5b1b437c, 2026-05-14). Verified 2026-05-23.
